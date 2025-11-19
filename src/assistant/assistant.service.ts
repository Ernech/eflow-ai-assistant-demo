import { Injectable } from '@nestjs/common';
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
import { GoogleGenAI } from '@google/genai';
import { UploadedFile } from "./helpers/content-gemini.helper";
import { RagRequest } from './interfaces/rag.interface';
import { RagService } from 'src/rag/rag.service';
import ollama from 'ollama';
@Injectable()
export class AssistantService {

    private openai: OpenAI;
    private readonly genAI: GoogleGenAI;

    private encoding: Tiktoken;
    private promptsFolderPath: string;

    constructor(private configService: ConfigService,
        private promptService: PromptService,
        private userService: UserService,
        private manualService: ManualesService,
        private ragService: RagService
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY'),
            baseURL: this.configService.get<string>('AZURE_OPEN_AI_URL')
        });
        this.genAI = new GoogleGenAI({ apiKey: this.configService.get<string>('GEMINI_API_KEY') })
        this.promptsFolderPath = this.configService.get<string>('PROMPTS_PATH') ?? "";
        this.encoding = get_encoding("cl100k_base");
    }

    public async consultarAsistente(asisstantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {
        try {
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(asisstantReqDTO.IdUsuario);
            if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }
            //Hacer la petición al servidor
            const ragReq: RagRequest = { query: asisstantReqDTO.Mensaje, sources: ["MANUAL EFLOW.pdf"] };
            const ragResponse = await this.ragService.getRagContext(ragReq);

            const contexto = ragResponse.Fragmentos.length > 0 ? this.promptService.OrganizarFragmentosRag(ragResponse.Fragmentos) : "No se encontró información relevante en los manuales del usuario.";
            const limiteTokens = 2000;

            const tokensMensajeUsuario = this.contarTokens(asisstantReqDTO.Mensaje);
            const tokensContexto = this.contarTokens(contexto);

            if (tokensContexto + tokensMensajeUsuario > limiteTokens) {
                const tokensDisponibles = limiteTokens - tokensContexto;
                let palabras = asisstantReqDTO.Mensaje.split(' ');
                let mensajeReducido = '';
                let contadorTokens = 0
                for (let palabra in palabras) {
                    let tokensPalabra = this.contarTokens(`${palabra.trim()}`)
                    if (tokensPalabra + contadorTokens > tokensDisponibles) break;
                    mensajeReducido += `${palabra} `;
                    contadorTokens += tokensPalabra;
                }
                asisstantReqDTO.Mensaje = mensajeReducido;
            }

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system', content: `Eres un asistente virtual experto en la herramienta eFlow.
                        Tu deber es responder únicamente con base en la información que encuentres en el contexto.
                        - Si no encuentras una respuesta, indícalo claramente al usuario.
                        - Si la pregunta está fuera de contexto, responde que solo puedes responder sobre el Sistema eFlow.
                        - No menciones el documento fuente en tus respuestas.
                        - Si el usuario te saluda, preséntate como el asistente virtual de EFLOW PROCESOS.
                        - Si el usuario se despide, haz lo propio.
                        - Si no existes información relevante responde con un mensaje como:
                        ""Lo siento, no he encontrado información relevante sobre tu consulta.""
                        `.trim()
                    },
                    { role: 'user', content: contexto },
                    { role: 'user', content: asisstantReqDTO.Mensaje },
                ],
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

    public async ConsultarProcesoAIniciarRag(assistantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {

        try {
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
            if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }
            const manualesUsuario: string[] = usuarioRecuperado.Procesos.map(procesoId => this.manualService.recuperarManualPorId(procesoId).NombreDocumento);
            const ragReq: RagRequest = { query: assistantReqDTO.Mensaje, sources: manualesUsuario };
            const ragResponse = await this.ragService.getRagContext(ragReq);
            const contexto = ragResponse.Fragmentos.length > 0 ? this.promptService.OrganizarFragmentosRag(ragResponse.Fragmentos) : "No se encontró información relevante en los manuales del usuario.";
            const limiteTokens = 2000;

            const tokensMensajeUsuario = this.contarTokens(assistantReqDTO.Mensaje);
            const tokensContexto = this.contarTokens(contexto);

            if (tokensContexto + tokensMensajeUsuario > limiteTokens) {
                const tokensDisponibles = limiteTokens - tokensContexto;
                let palabras = assistantReqDTO.Mensaje.split(' ');
                let mensajeReducido = '';
                let contadorTokens = 0
                for (let palabra in palabras) {
                    let tokensPalabra = this.contarTokens(`${palabra.trim()}`)
                    if (tokensPalabra + contadorTokens > tokensDisponibles) break;
                    mensajeReducido += `${palabra} `;
                    contadorTokens += tokensPalabra;
                }
                assistantReqDTO.Mensaje = mensajeReducido;
            }

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system', content: `Eres un asistente virtual para la herramienta EFLOW Procesos que brinda asistencia a los empleados para que logren encontrar el proceso que deben utilizar, 
                           en tu respuesta no es necesario especificar cuáles son las palabras clave, 
                          ni los siguientes pasos a seguir, solo una breve descripción del proceso a iniciar, 
                        importante, el nombre del proceso entre comillas dobles y puede darse el caso de que un usuario tenga acceso a procesos que otros usuario no, si no encuentras un proceso
                        acorde a su solicitud símplemente responde eso, no es necesario listar sus procesos disponibles. 
                        Si el usuario pregunta algo que no tiene reconsultaslación con tu área, responde con un mensaje como:
                        ""Lo siento, solo puedo responder  relacionadas con [tema].""  
                        Si el usuario te saluda preséntate como el asistente virtual de EFLOW PROCESOS.   
                        Si el usuario se despide, haz lo propio.
                        Si no existes información relevante responde con un mensaje como:
                        ""Lo siento, no he encontrado un proceso relacionado a tu solicitud.""                   
                        Aquí tienes una lista de procesos:
                        `.trim()
                    },
                    { role: 'user', content: contexto },
                    { role: 'user', content: assistantReqDTO.Mensaje },
                ],
            });
            return {
                Codigo: 100,
                Respuesta: true,
                Mensaje: completion.choices[0].message.content ?? ''
            };
        }
        catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ocurrió un error ${error}`
            };
        }
    }

    public async ConsultarManualProcesoRag(manualId: number, assistantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {
        const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
        if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
            return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
        }
        const manualRecuperado = this.manualService.recuperarManualPorId(manualId);
        if (!manualRecuperado || manualRecuperado.ManualId <= 0) {
            return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró el manual solicitado" };
        }
        if (!usuarioRecuperado.Procesos.includes(manualId)) {
            return { Codigo: 300, Respuesta: true, Mensaje: "El usuario no tiene acceso al manual solicitado" };
        }
        const ragReq: RagRequest = { query: assistantReqDTO.Mensaje, sources: [manualRecuperado.NombreDocumento] };
        const ragResponse = await this.ragService.getRagContext(ragReq);
        const contexto = ragResponse.Fragmentos.length > 0 ? this.promptService.OrganizarFragmentosRag(ragResponse.Fragmentos) : "No se encontró información relevante en los manuales del usuario.";
        const limiteTokens = 2000;

        const tokensMensajeUsuario = this.contarTokens(assistantReqDTO.Mensaje);
        const tokensContexto = this.contarTokens(contexto);

        if (tokensContexto + tokensMensajeUsuario > limiteTokens) {
            const tokensDisponibles = limiteTokens - tokensContexto;
            let palabras = assistantReqDTO.Mensaje.split(' ');
            let mensajeReducido = '';
            let contadorTokens = 0
            for (let palabra in palabras) {
                let tokensPalabra = this.contarTokens(`${palabra.trim()}`)
                if (tokensPalabra + contadorTokens > tokensDisponibles) break;
                mensajeReducido += `${palabra} `;
                contadorTokens += tokensPalabra;
            }
            assistantReqDTO.Mensaje = mensajeReducido;
        }

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system', content: `Eres un asistente virtual para la herramienta EFLOW Procesos que brinda asistencia a los empleados, responde a la pregunta del usuario
                    relacionada con el siguiente contexto, el cual corresponde a un manual de un proceso.
                    Si no encuentras una respuesta, indícalo claramente al usuario.
                    Si la pregunta está fuera de contexto, responde que solo puedes responder sobre el Sistema eFlow.
                    No menciones el documento fuente en tus respuestas.
                    Si el usuario te saluda, preséntate como el asistente virtual de EFLOW PROCESOS.
                    Si el usuario se despide, haz lo propio.
                    Si no existes información relevante responde con un mensaje como:
                    ""Lo siento, no he encontrado información relevante en el manual sobre tu consulta.""
                        `.trim()
                },
                { role: 'user', content: contexto },
                { role: 'user', content: assistantReqDTO.Mensaje },
            ],
        });
        return {
            Codigo: 100,
            Respuesta: true,
            Mensaje: completion.choices[0].message.content ?? ''
        };
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

    public async ConsultarManualEflowRag(assistantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {
        try {
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
            if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }
            //Hacer la petición al servidor
            const ragReq: RagRequest = { query: assistantReqDTO.Mensaje, sources: ["MANUAL EFLOW.pdf"] };
            const ragResponse = await this.ragService.getRagContext(ragReq);
            const contexto = this.promptService.OrganizarFragmentosRag(ragResponse.Fragmentos);
            const response = await this.genAI.models.generateContent({
                model: "gemini-2.5-flash-lite",
                contents: [
                    {
                        role: "model",
                        parts: [
                            {
                                text: `
                            Eres un asistente virtual experto en la herramienta eFlow.
                            Tu deber es responder únicamente con base en la información que encuentres en el contexto.
                            - Si no encuentras una respuesta, indícalo claramente al usuario.
                            - Si la pregunta está fuera de contexto, responde que solo puedes responder sobre el Sistema eFlow.
                            - No menciones el documento fuente en tus respuestas.
                            - Si el usuario te saluda, preséntate como el asistente virtual de EFLOW PROCESOS.
                            - Si el usuario se despide, haz lo propio.
                            `.trim(),
                            },
                        ],
                    },
                    {
                        role: "user",
                        parts: [
                            {
                                text: `
                                ### Contexto
                                ${contexto}
                                `.trim(),
                            },
                            {
                                text: `
                                    ### Pregunta del usuario
                                    ${assistantReqDTO.Mensaje}
                                    `.trim(),
                            },
                        ],
                    },
                ],
            });

            return { Codigo: 100, Respuesta: true, Mensaje: response.text! };

        }
        catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ha ocurrido un error ${error?.message ?? error}`
            }
        }
    }

    public async ConsultarManualEflowRagOllama(assistantReqDTO: AssistantReqDTO): Promise<AssistantResDTO> {
        try {
            const usuarioRecuperado = this.userService.recuperarUsuarioPorId(assistantReqDTO.IdUsuario);
            if (!usuarioRecuperado || usuarioRecuperado.Id <= 0) {
                return { Codigo: 300, Respuesta: true, Mensaje: "No se encontró al usuario" };
            }
            //Hacer la petición al servidor
            const ragReq: RagRequest = { query: assistantReqDTO.Mensaje, sources: ["MANUAL EFLOW.pdf"] };
            const ragResponse = await this.ragService.getRagContext(ragReq);
            const contexto = this.promptService.OrganizarFragmentosRag(ragResponse.Fragmentos);
            const response = await ollama.chat({
                model: 'phi4-mini', // Use the model you pulled
                messages: [
                    {
                        role: "system", content: `Eres un asistente virtual experto en la herramienta eFlow.
                            Tu deber es responder únicamente con base en la información que encuentres en el contexto.
                            - Si no encuentras una respuesta, indícalo claramente al usuario.
                            - Si la pregunta está fuera de contexto, responde que solo puedes responder sobre el Sistema eFlow.
                            - No menciones el documento fuente en tus respuestas.
                            - Si el usuario te saluda, preséntate como el asistente virtual de EFLOW PROCESOS.
                            - Si el usuario se despide, haz lo propio.
                            `.trim(),
                    },
                    { role: 'user', content: `##CONTEXTO: ${contexto}` },
                    { role: "user", content: `##PREGUNTA DEL USUARIO: ${assistantReqDTO.Mensaje}` }],
            });

            return { Codigo: 100, Respuesta: true, Mensaje: response.message.content }

        } catch (error) {
            return {
                Codigo: 400,
                Respuesta: false,
                Mensaje: `Ha ocurrido un error ${error?.message ?? error}`
            }
        }
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
