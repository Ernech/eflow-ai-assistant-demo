import { Inject, Injectable } from '@nestjs/common';
import * as procesos from '../../prompts/prompts.json';
import OpenAI from 'openai';
import { AssistantReqDTO } from './dto/assistant-req.dto';
import { ProcesoInterface } from './interfaces/proceso.interface';
import { ConfigService } from '@nestjs/config';
import { AssistantResDTO } from './dto/assistant-res.dto';
import { get_encoding, Tiktoken } from 'tiktoken';
import * as fs from 'fs';
import path from 'path';
import { PdfService } from 'src/pdf/pdf.service';
import { PromptService } from 'src/prompt/prompt.service';
import { DocService } from 'src/doc/doc.service';
import { UserService } from 'src/user/user.service';
import { ManualesService } from 'src/manuales/manuales.service';
import { readFile } from 'fs/promises';
import { Content, GoogleGenAI } from '@google/genai';
import { buildContent, UploadedFile } from "./helpers/content-gemini.helper";
import { RepositoryEnum } from 'src/enum/repository.enum';
import { UsuarioEntity } from 'src/db/persistence/user.entity';
import { Repository } from 'typeorm';
import { ProcesoEntity } from 'src/db/persistence/proceso.entity';
import { DominiosEntity } from 'src/db/persistence/dominio.entity';
import { UsuarioProcesoEntity } from 'src/db/persistence/usuario-proceso.entity';
@Injectable()
export class AssistantService {

    private openai: OpenAI;
    private readonly genAI: GoogleGenAI;

    private encoding: Tiktoken;
    private promptsFolderPath: string;

    constructor(private configService: ConfigService,
        private pdfService: PdfService,
        private docService: DocService,
        private promptService: PromptService,
        private userService: UserService,
        private manualService: ManualesService,
        @Inject(RepositoryEnum.USUARIO) private readonly userRepository: Repository<UsuarioEntity>,
        @Inject(RepositoryEnum.PROCESO) private readonly procesoRepository: Repository<ProcesoEntity>,
        @Inject(RepositoryEnum.DOMINIO) private readonly dominioRepository: Repository<DominiosEntity>,
        @Inject(RepositoryEnum.USUARIO_PROCESO) private readonly usuarioProcesoRepository: Repository<UsuarioProcesoEntity>
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });
        this.genAI = new GoogleGenAI({ apiKey: this.configService.get<string>('GEMINI_API_KEY') })
        this.promptsFolderPath = this.configService.get<string>('PROMPTS_PATH') ?? "";
        this.encoding = get_encoding("cl100k_base");
    }
    private construirPrompt(procesosLista: ProcesoInterface[]): string {
        const catalogo = procesosLista['default']
            .map(
                (p) =>
                    `- ${p.Nombre}: ${p.Descripcion}. Palabras clave: ${p.PalabrasClave.join(', ')}.`
            )
            .join('\n');

        return `Eres un asistente virtual para la herramienta EFLOW Procesos que brinda asistencia a los empleados para que logren encontrar el proceso que deben utilizar, 
                           en tu respuesta no es necesario especificar cuáles son las palabras clave, 
                          ni los siguientes pasos a seguir, solo una breve descripción del proceso a iniciar, 
                        importante, el nombre del proceso entre comillas dobles y puede darse el caso de que un usuario tenga acceso a procesos que otros usuario no, si no encuentras un proceso
                        acorde a su solicitud símplemente responde eso, no es necesario listar sus procesos disponibles. 
                        Si el usuario pregunta algo que no tiene relación con tu área, responde con un mensaje como:
                        ""Lo siento, solo puedo responder consultas relacionadas con [tema].""                        
                        Aquí tienes una lista de procesos:
        ${catalogo}}`;
    }

    public async consultarAsistente(asisstantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {
        try {
            const procesosString = JSON.stringify(procesos)
            const procesosList: ProcesoInterface[] = JSON.parse(procesosString)

            let propmtContexto = this.construirPrompt(procesosList);
            const limiteTokens = 2000;

            const tokensMensajeUsuario = this.contarTokens(asisstantReqDTO.Mensaje);
            const tokensContexto = this.contarTokens(propmtContexto);

            if (tokensContexto + tokensMensajeUsuario > limiteTokens) {
                const tokensDisponibles = limiteTokens - tokensContexto;
                let palabras = asisstantReqDTO.Mensaje.split(' ');
                let mensajeReducido = '';
                let contadorTokens = 0
                for (let palabra in palabras) {
                    let tokensPalabra = this.contarTokens(` ${palabra.trim()}`)
                    if (tokensPalabra + contadorTokens > tokensDisponibles) break;
                    mensajeReducido += `${palabra} `;
                    contadorTokens += tokensPalabra;
                }
                asisstantReqDTO.Mensaje = mensajeReducido;
            }

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4.1',
                messages: [{ role: 'user', content: asisstantReqDTO.Mensaje }, { role: 'system', content: propmtContexto }],
            });
            return {
                Codigo: 100,
                Respuesta: true,
                Mensaje: completion.choices[0].message.content ?? ''
            };
        } catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ocurrió un error ${error}`
            };
        }


    }

    public async consultarAsistentePdf(assistantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {
        try {
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
            if (usuarioRecuperado.Id > 0) {
                const folderPath = `${this.promptsFolderPath}/manuales`
                let procesos: ProcesoInterface[] = [];
                const files = fs.readdirSync(folderPath);
                for (let i = 0; i < files.length; i++) {
                    const filePath = path.join(folderPath, files[i]);
                    const filenameWithoutExtension = path.parse(filePath).name;
                    if (usuarioRecuperado.Procesos.includes(filenameWithoutExtension.toUpperCase())) {
                        let texto: string = await this.pdfService.extractTextFromPdfNodePoppler(filePath);
                        let lineasTexto = texto.split('\n')
                            .map(linea => linea.trim())
                            .filter(linea => linea !== null && linea !== '');
                        let titulo = lineasTexto[0];
                        let descripcion = this.promptService.ObtenerSeccion(lineasTexto, "Descripción del proceso.");
                        let palabrasClave = this.promptService.ObtenerSeccion(lineasTexto, "Palabras clave del proceso.");
                        let listaPalabrasCLave: string[] = palabrasClave.split(/[,;.]/).map(linea => linea.trim())
                            .filter(linea => linea !== undefined && linea !== "");
                        procesos.push({
                            Nombre: titulo,
                            Descripcion: descripcion,
                            PalabrasClave: listaPalabrasCLave
                        });
                    }
                }


                const promptContexto = this.construirPrompt(procesos);
                const limiteTokens = 2000;

                const tokensMensajeUsuario = this.contarTokens(assistantReqDTO.Mensaje);
                const tokensContexto = this.contarTokens(promptContexto);

                if (tokensContexto + tokensMensajeUsuario > limiteTokens) {
                    const tokensDisponibles = limiteTokens - tokensContexto;
                    let palabras = assistantReqDTO.Mensaje.split(' ');
                    let mensajeReducido = '';
                    let contadorTokens = 0
                    for (let palabra in palabras) {
                        let tokensPalabra = this.contarTokens(` ${palabra.trim()}`)
                        if (tokensPalabra + contadorTokens > tokensDisponibles) break;
                        mensajeReducido += `${palabra} `;
                        contadorTokens += tokensPalabra;
                    }
                    assistantReqDTO.Mensaje = mensajeReducido;
                }

                const completion = await this.openai.chat.completions.create({
                    model: 'gpt-4.1',
                    messages: [{ role: 'user', content: assistantReqDTO.Mensaje }, { role: 'system', content: promptContexto }],
                });
                return {
                    Codigo: 100,
                    Respuesta: true,
                    Mensaje: completion.choices[0].message.content ?? ''
                };

            }
            else {
                return {
                    Codigo: 300,
                    Respuesta: true,
                    Mensaje: "No se encontró al usuario"
                }
            }

        } catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ocurrió un error ${error}`
            };
        }
    }

    public async ConsultarAsistenteDoc(assistantReqDTO: AssistantReqDTO) {
        try {
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
            if (usuarioRecuperado.Id > 0) {
                const folderPath = `${this.promptsFolderPath}/doc`
                let procesos: ProcesoInterface[] = [];
                const files = fs.readdirSync(folderPath);
                for (let i = 0; i < files.length; i++) {
                    const filePath = path.join(folderPath, files[i]);
                    const filenameWithoutExtension = path.parse(filePath).name;
                    if (usuarioRecuperado.Procesos.includes(filenameWithoutExtension.toUpperCase())) {
                        let texto: string = await this.docService.extractTextFromDocFile(filePath);
                        let lineasTexto = texto.split('\n')
                            .map(linea => linea.trim())
                            .filter(linea => linea !== null && linea !== '');
                        let titulo = lineasTexto[0];
                        let descripcion = this.promptService.ObtenerSeccion(lineasTexto, "Descripción del proceso.");
                        let palabrasClave = this.promptService.ObtenerSeccion(lineasTexto, "Palabras clave del proceso.");
                        let listaPalabrasCLave: string[] = palabrasClave.split(/[,;.]/).map(linea => linea.trim())
                            .filter(linea => linea !== undefined && linea !== "");
                        procesos.push({
                            Nombre: titulo,
                            Descripcion: descripcion,
                            PalabrasClave: listaPalabrasCLave
                        });
                    }
                }
                const promptContexto = this.construirPrompt(procesos);
                const limiteTokens = 2000;

                const tokensMensajeUsuario = this.contarTokens(assistantReqDTO.Mensaje);
                const tokensContexto = this.contarTokens(promptContexto);

                if (tokensContexto + tokensMensajeUsuario > limiteTokens) {
                    const tokensDisponibles = limiteTokens - tokensContexto;
                    let palabras = assistantReqDTO.Mensaje.split(' ');
                    let mensajeReducido = '';
                    let contadorTokens = 0
                    for (let palabra in palabras) {
                        let tokensPalabra = this.contarTokens(` ${palabra.trim()}`)
                        if (tokensPalabra + contadorTokens > tokensDisponibles) break;
                        mensajeReducido += `${palabra} `;
                        contadorTokens += tokensPalabra;
                    }
                    assistantReqDTO.Mensaje = mensajeReducido;
                }

                const completion = await this.openai.chat.completions.create({
                    model: 'gpt-4.1',
                    messages: [{ role: 'user', content: assistantReqDTO.Mensaje }, { role: 'system', content: promptContexto }],
                });
                return {
                    Codigo: 100,
                    Respuesta: true,
                    Mensaje: completion.choices[0].message.content ?? ''
                };
            }
            else {
                return {
                    Codigo: 300,
                    Respuesta: true,
                    Mensaje: "No se encontró al usuario"
                }
            }

        } catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ocurrió un error ${error}`
            };
        }
    }

    public async ConsultarManualesPfd(assistantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {
        try {
            // 1) Recuperar usuario
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
            if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }

            // 2) Resolver carpeta y filtrar PDFs que correspondan a sus procesos
            const folderPath = path.resolve(this.promptsFolderPath, "manuales");
            const allFiles = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith(".pdf"));

            const procesosUpper = new Set<string>((usuarioRecuperado.Procesos ?? []).map((p: string) => p.toUpperCase()));
            const filesToUse = allFiles.filter(f => procesosUpper.has(path.parse(f).name.toUpperCase()));

            if (filesToUse.length === 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "El usuario no tiene manuales/procesos asignados" };
            }

            // 3) Subir TODOS los PDFs a OpenAI y construir manualesArray con tipos literales
            const uploads = await Promise.all(
                filesToUse.map(async (fname) => {
                    let fileId: string = "";
                    let nombreProceso: string = fname.split('.')[0];
                    let manual = this.manualService.recuperarManualPorNombre(nombreProceso);
                    if (manual.FileId == "") {
                        const filePath = path.join(folderPath, fname);
                        const uploaded = await this.openai.files.create({
                            file: fs.createReadStream(filePath),
                            purpose: "user_data",
                        });
                        fileId = uploaded.id;
                        this.manualService.actualizarFileId(manual.ManualId, fileId);
                    }
                    else {
                        fileId = manual.FileId;
                    }
                    const item: { type: "input_file"; file_id: string } = { type: "input_file", file_id: fileId };
                    return item;
                })
            );

            // 4) Construir el content SIN spread para evitar fricciones de TS
            let content: Array<
                | { type: "input_file"; file_id: string }
                | { type: "input_text"; text: string }
            > =
                [
                    {
                        type: "input_text",
                        text: `
                          Eres el asistente virtual de una herramienta de automatización de procesos llamada eflow.  
                          Lee los siguiente documentos y responde a la pregunta del usuario indicandole que proceso debe iniciar con la información que encuentres en los documentos.
                          Ignora carátulas, imágenes, índices y anexos vacíos, solo toma en cuenta el texto.
                          Si no encuentras un proceso que cunpla con los requisitos de la pregunta, simplemente comunícale al usuario.
                          Solo toma en cuanta las primeras 3 o 4 páginas de cada documento para formular la respuesta.
                          Solo debes indicarle el nombre del proceso a iniciar y una breve descripción en base al objetivo general o la descripción del mismo, no es necesario incluir muchos elementos en la respuesta.
                          Si la pregunta está fuera de contexto también comunícale al usuario.
                        `.trim(),
                    },
                    {
                        type: "input_text",
                        text:
                            assistantReqDTO.Mensaje?.trim()
                    },
                ];
            content.push(...uploads)
            // 5) Llamar al modelo
            const response = await this.openai.responses.create({
                model: "gpt-4o-mini",
                input: [{ role: "user", content }],
            });

            return { Codigo: 100, Respuesta: true, Mensaje: response.output_text ?? "" };

        } catch (error: any) {
            return { Codigo: 400, Respuesta: false, Mensaje: `Ocurrió un error: ${error?.message ?? error}` };
        }
    }

    public async ConsultarManual(manualId: number, assistantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {
        try {
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
            if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }
            const manualProcesoRecuperado = this.manualService.recuperarManualPorId(manualId);
            if (!manualProcesoRecuperado || manualProcesoRecuperado.ManualId <= 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró el proceso" };
            }
            //Verificar que el usuario tenga acceso a este proceso
            const procesosUpper = new Set<string>((usuarioRecuperado.Procesos ?? []).map((p: string) => p.toUpperCase()));
            if (!procesosUpper.has(manualProcesoRecuperado.NombreProceso.toUpperCase())) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No tiene asignado este proceso" }
            }
            //Recuperar el path del proceso
            const folderPath = path.resolve(this.promptsFolderPath, "manuales");
            const filePath = path.join(folderPath, `${manualProcesoRecuperado.NombreProceso}.pdf`);
            // const uploadedFile = await this.openai.files.create({
            //     file: fs.createReadStream(filePath),
            //     purpose: "user_data",
            // });
            let base64String = await this.fileToBase64(filePath);
            let content: Array<
                | { type: "input_file"; filename: string; file_data: string }
                | { type: "input_text"; text: string }
            > =
                [
                    {
                        type: "input_file",
                        filename: `${manualProcesoRecuperado.NombreProceso}.pdf`,
                        file_data: `data:application/pdf;base64,${base64String}`
                    },
                    {
                        type: "input_text",
                        text: `
                                Lee el siguiente documento y responde a la pregunta del usuario con información que encuentres en el mismo.
                                Ignora carátulas, imágenes, índices y anexos vacíos, solo toma en cuenta el texto.
                                Si no encuentras una respuesta, simplemente comunícale al usuario.
                                Si la pregunta está fuera de contexto también comunícale al usuario.
                            `.trim(),
                    },
                    {
                        type: "input_text",
                        text:
                            assistantReqDTO.Mensaje.trim(),
                    },
                ];
            const response = await this.openai.responses.create({
                model: "gpt-4o-mini",
                input: [{ role: "user", content }],
            });

            return { Codigo: 100, Respuesta: true, Mensaje: response.output_text ?? "" };
        } catch (error) {
            return { Codigo: 400, Respuesta: false, Mensaje: `Ocurrió un error: ${error?.message ?? error}` };
        }
    }



    public async ConsultarAsistenteGemini(
        assistantReqDTO: AssistantReqDTO
    ): Promise<AssistantResDTO> {
        try {
            // PDF locales a subir
            // 1) Recuperar usuario
            const usuarioRecuperado = await this.userRepository.findOne({ where: { id: assistantReqDTO.IdUsuario } });
            if (!usuarioRecuperado) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }
            //Recuperar sus procesos
            const usuarioManualesRecuperados = await this.usuarioProcesoRepository.find({ where: { UsuarioId: usuarioRecuperado.id, status: 1 } })
            if (!usuarioManualesRecuperados) {
                return { Codigo: 300, Respuesta: true, Mensaje: "El usuario no tiene manuales/procesos asignados" };
            }
            const listaProcesosId: number[] = usuarioManualesRecuperados.map((usuarioManual) => usuarioManual.ProcesoId);
            //Recuperar proceos
            const procesos = await this.procesoRepository.createQueryBuilder('proceso').whereInIds(listaProcesosId)
                .andWhere("proceso.status=:status", { status: 1 }).getMany();
            // Subimos los PDFs y guardamos la info para el helper
            const uploadedFiles: UploadedFile[] = [];
            for (const proceso of procesos) {
                const dominioTipoRuta = await this.dominioRepository.findOne({ where: { id: proceso.TipoRutaManualId, status: 1 } })
                if (dominioTipoRuta) {
                    const file = dominioTipoRuta.Descripcion == "FILE SYSTEM" ?
                        await this.pdfService.uploadLocalPDF(this.genAI, proceso.RutaManual, `PDF ${proceso.id}`) :
                        await this.pdfService.uploadRemotePDF(this.genAI, proceso.RutaManual, `PDF ${proceso.id}`);
                    if (file.uri && file.mimeType) {
                        uploadedFiles.push({
                            uri: file.uri,
                            mimeType: file.mimeType,
                            displayName: `PDF ${proceso.id + 1}`,
                        });
                    }
                }
            }
            const response = await this.genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    `Eres el asistente virtual de una herramienta de automatización de procesos llamada eflow.  
                          Lee los siguiente documentos y responde a la pregunta del usuario indicandole que proceso debe iniciar con la información que encuentres en los documentos.
                          Ignora carátulas, imágenes, índices y anexos vacíos, solo toma en cuenta el texto.
                          Si no encuentras un proceso que cunpla con los requisitos de la pregunta, simplemente comunícale al usuario.
                          Solo toma en cuanta las primeras 3 o 4 páginas de cada documento para formular la respuesta.
                          Solo debes indicarle el nombre del proceso a iniciar y una breve descripción en base al objetivo general o la descripción del mismo, no es necesario incluir muchos elementos en la respuesta.
                          Si la pregunta está fuera de contexto también comunícale al usuario.`,
                    assistantReqDTO.Mensaje,
                    ...uploadedFiles.map(file => ({
                        fileData: {
                            fileUri: file.uri,
                            mimeType: file.mimeType,
                        },
                    }))


                ],
            });


            return { Codigo: 100, Respuesta: true, Mensaje: response.text! };
        } catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ocurrió un error: ${error?.message ?? error}`,
            };
        }
    }

    public async ConsultarDocumentoGemini(manualId: number,
        assistantReqDTO: AssistantReqDTO
    ): Promise<AssistantResDTO> {
        try {
            const usuarioRecuperado = await this.userRepository.findOne({ where: { id: assistantReqDTO.IdUsuario, status: 1 } })
            if (!usuarioRecuperado) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }
            const manualProcesoRecuperado = await this.procesoRepository.findOne({ where: { id: manualId, status: 1 } });
            if (!manualProcesoRecuperado) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró el proceso" };
            }
            //Verificar que el usuario tenga acceso a este proceso
            const usuarioProcesoRecuperado = await this.usuarioProcesoRepository.findOne({ where: { UsuarioId: usuarioRecuperado.id, ProcesoId: manualProcesoRecuperado.id, status: 1 } })
            if (!usuarioProcesoRecuperado) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No tiene asignado este proceso" }
            }
            //Recuperar el tipo de ruta del archivo
            const dominioTipoRuta = await this.dominioRepository.findOne({ where: { id: manualProcesoRecuperado.TipoRutaManualId, status: 1 } })
            if (!dominioTipoRuta) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se pudo determinar el tipo de ruta del manual" }
            }
            //Recuperar el path del proceso
            let base64String = "";
            if (dominioTipoRuta.Descripcion === "FILE SYSTEM") {
                // const folderPath = path.resolve(this.promptsFolderPath, "manuales");
                // const filePath = path.join(folderPath, `${manualProcesoRecuperado.NombreProceso}.pdf`);
                base64String = await this.fileToBase64(manualProcesoRecuperado.RutaManual);
            }
            else {
                const pdfResp = await fetch(manualProcesoRecuperado.RutaManual)
                    .then((response) => response.arrayBuffer());
                base64String = Buffer.from(pdfResp).toString("base64");
            }
            if (base64String === "") {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se pudo recuperar el archivo del manual del proceso" }
            }
            const response = await this.genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    `Lee el siguiente documento y responde a la pregunta del usuario con información que encuentres en el mismo.
                                Ignora carátulas, imágenes, índices y anexos vacíos, solo toma en cuenta el texto.
                                Si no encuentras una respuesta, simplemente comunícale al usuario.
                                Si la pregunta está fuera de contexto también comunícale al usuario.
                            `.trim(),
                    assistantReqDTO.Mensaje,
                    {
                        inlineData: {
                            mimeType: "application/pdf",
                            data: base64String
                        }
                    }


                ],
            });

            return { Codigo: 100, Respuesta: true, Mensaje: response.text! };
        } catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ocurrió un error: ${error?.message ?? error}`,
            };
        }
    }

    public async ConsultarManualEflow(assistantReqDTO: AssistantReqDTO
    ): Promise<AssistantResDTO> {
        try {
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
            if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }

            //Recuperar el path del proceso
            const folderPath = path.resolve(this.promptsFolderPath, "manuales");
            const filePath = path.join(folderPath, `MANUAL EFLOW.pdf`);
            let base64String = await this.fileToBase64(filePath);
            const response = await this.genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    `Lee el siguiente documento y responde la pregunta del usuario en base a la información que encuentres, 
                si no encuentras una respuesta comunícaselo al usuario, 
                si la pregunta está fuera de contexto dile que solo puedes responder preguntas acerca del Sistema eFlow. 
                En tu respuesta no es necesario mencionar al documento.
                Si el usuario te saluda presentate cómo un asistente de la herramienta de EFLOW PROCESOS.
                            `.trim(),
                    assistantReqDTO.Mensaje,
                    {
                        inlineData: {
                            mimeType: "application/pdf",
                            data: base64String
                        }
                    }


                ],
            });

            return { Codigo: 100, Respuesta: true, Mensaje: response.text! };
        } catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ocurrió un error: ${error?.message ?? error}`,
            };
        }
    }

    public async ConsultarAsistenteGeminiStream(
        assistantReqDTO: AssistantReqDTO
    ) {
        // Recuperar usuario (igual que en tu servicio original)
        const usuarioRecuperado = this.userService.recuperarUsuarioPorId(
            assistantReqDTO.IdUsuario
        );

        if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
            throw new Error("No se encontró al usuario");
        }

        // Procesar PDFs (igual que en tu código original)
        const folderPath = path.resolve(this.promptsFolderPath, "manuales");
        const allFiles = fs.readdirSync(folderPath).filter(f =>
            f.toLowerCase().endsWith(".pdf")
        );

        const procesosUpper = new Set<string>(
            (usuarioRecuperado.Procesos ?? []).map((p: string) => p.toUpperCase())
        );

        const filesToUse = allFiles.filter(f =>
            procesosUpper.has(path.parse(f).name.toUpperCase())
        );

        if (filesToUse.length === 0) {
            throw new Error("El usuario no tiene manuales/procesos asignados");
        }

        const uploadedFiles: UploadedFile[] = [];
        for (const [index, pdfPath] of filesToUse.entries()) {
            const file = await this.pdfService.uploadLocalPDF(
                this.genAI,
                `${this.promptsFolderPath}/manuales/${pdfPath}`,
                `PDF ${index + 1}`
            );
            if (file.uri && file.mimeType) {
                uploadedFiles.push({
                    uri: file.uri,
                    mimeType: file.mimeType,
                    displayName: `PDF ${index + 1}`,
                });
            }
        }

        // Llamada en modo STREAM
        return await this.genAI.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: [
                `Eres el asistente virtual de una herramienta de automatización de procesos llamada eflow.  
                          Lee los siguiente documentos y responde a la pregunta del usuario indicandole que proceso debe iniciar con la información que encuentres en los documentos.
                          Ignora carátulas, imágenes, índices y anexos vacíos, solo toma en cuenta el texto.
                          Si no encuentras un proceso que cunpla con los requisitos de la pregunta, simplemente comunícale al usuario.
                          Solo toma en cuanta las primeras 3 o 4 páginas de cada documento para formular la respuesta.
                          Solo debes indicarle el nombre del proceso a iniciar y una breve descripción en base al objetivo general o la descripción del mismo, no es necesario incluir muchos elementos en la respuesta.
                          Si la pregunta está fuera de contexto también comunícale al usuario.`,
                assistantReqDTO.Mensaje,
                ...uploadedFiles.map(file => ({
                    fileData: {
                        fileUri: file.uri,
                        mimeType: file.mimeType,
                    },
                })),
            ],
        });
    }

    public async ConsultarDocumentoStreamGemini(manualId: number,
        assistantReqDTO: AssistantReqDTO) {
        const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
        if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
            throw new Error("No se encontró al usuario");
        }
        const manualProcesoRecuperado = this.manualService.recuperarManualPorId(manualId);
        if (!manualProcesoRecuperado || manualProcesoRecuperado.ManualId <= 0) {
            throw new Error("No se encontró el manual");
        }
        //Verificar que el usuario tenga acceso a este proceso
        const procesosUpper = new Set<string>((usuarioRecuperado.Procesos ?? []).map((p: string) => p.toUpperCase()));
        if (!procesosUpper.has(manualProcesoRecuperado.NombreProceso.toUpperCase())) {
            throw new Error("No tiene asignado este proceso");
        }
        //Recuperar el path del proceso
        const folderPath = path.resolve(this.promptsFolderPath, "manuales");
        const filePath = path.join(folderPath, `${manualProcesoRecuperado.NombreProceso}.pdf`);
        let base64String = await this.fileToBase64(filePath);
        return await this.genAI.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: [
                `Lee el siguiente documento y responde a la pregunta del usuario con información que encuentres en el mismo.
                                Ignora carátulas, imágenes, índices y anexos vacíos, solo toma en cuenta el texto.
                                Si no encuentras una respuesta, simplemente comunícale al usuario.
                                Si la pregunta está fuera de contexto también comunícale al usuario.
                            `.trim(),
                assistantReqDTO.Mensaje,
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: base64String
                    }
                }
            ],
        });
    }

    public async ConsultarDocumentoEflowStreamGemini(assistantReqDTO: AssistantReqDTO) {
        const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
        if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
            throw new Error("No se encontró al usuario");
        }
        //Recuperar el path del proceso
        const folderPath = path.resolve(this.promptsFolderPath, "manuales");
        const filePath = path.join(folderPath, `MANUAL EFLOW.pdf`);
        let base64String = await this.fileToBase64(filePath);
        return await this.genAI.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: [
                `Lee el siguiente documento y responde la pregunta del usuario en base a la información que encuentres, 
                si no encuentras una respuesta comunícaselo al usuario, 
                si la pregunta está fuera de contexto dile que solo puedes responder preguntas acerca del Sistema eFlow. 
                En tu respuesta no es necesario mencionar al documento.
                Si el usuario te saluda presentate cómo un asistente de la herramienta de EFLOW PROCESOS
                            `.trim(),
                assistantReqDTO.Mensaje,
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: base64String
                    }
                }
            ],
        });
    }

    private contarTokens(prompt: string): number {
        return this.encoding.encode(prompt).length;
    }

    private async fileToBase64(filePath: string): Promise<string> {
        try {
            const buffer = await readFile(filePath);
            const base64String = buffer.toString('base64');
            return base64String;
        } catch (error) {
            console.error('Error reading file or converting to Base64:', error);
            throw error;
        }
    }


}
