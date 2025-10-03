import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DominiosEntity } from 'src/db/persistence/dominio.entity';
import { ProcesoEntity } from 'src/db/persistence/proceso.entity';
import { UsuarioEntity } from 'src/db/persistence/user.entity';
import { UsuarioProcesoEntity } from 'src/db/persistence/usuario-proceso.entity';
import { RepositoryEnum } from 'src/enum/repository.enum';
import { Repository } from 'typeorm';

@Injectable()
export class SeedService implements OnApplicationBootstrap {

    constructor(
        @Inject(RepositoryEnum.USUARIO) private readonly userRepository: Repository<UsuarioEntity>,
        @Inject(RepositoryEnum.PROCESO) private readonly procesoRepository: Repository<ProcesoEntity>,
        @Inject(RepositoryEnum.DOMINIO) private readonly dominioRepository: Repository<DominiosEntity>,
        @Inject(RepositoryEnum.USUARIO_PROCESO) private readonly usuarioProcesoRepository: Repository<UsuarioProcesoEntity>
    ) { }

    async onApplicationBootstrap() {
        const dominios = await this.dominioRepository.find({ where: { status: 1 } })
        if (!dominios || dominios.length === 0) {
            await this.crearDominios();
        }
        let usuarios = await this.userRepository.find({ where: { status: 1 } });
        if (!usuarios || usuarios.length === 0) {
            await this.crearUsuarios();
            usuarios = await this.userRepository.find({ where: { status: 1 } });
        }
        let procesos = await this.procesoRepository.find({ where: { status: 1 } });
        if (!procesos || procesos.length === 0) {
            await this.crearProcesos();
            procesos = await this.procesoRepository.find({ where: { status: 1 } });
        }
        const usuarioProcesoList = await this.usuarioProcesoRepository.find({ where: { status: 1 } });
        if (!usuarioProcesoList || usuarioProcesoList.length === 0) {
            await this.asignarProcesosAUsuarios(usuarios, procesos);
        }
    }


    async crearDominios() {
        const dominioTipoRutaManualFS = this.dominioRepository.create({ Clave: 'TIPO_RUTA_MANUAL', Valor: 1, Descripcion: 'FILE SYSTEM' });
        const dominioTipoRutaManualURL = this.dominioRepository.create({ Clave: 'TIPO_RUTA_MANUAL', Valor: 2, Descripcion: 'URL' });
        await this.dominioRepository.save(dominioTipoRutaManualFS);
        await this.dominioRepository.save(dominioTipoRutaManualURL);
    }

    async crearUsuarios() {
        const user1 = this.userRepository.create({ Nombre: "Ernesto" });
        const user2 = this.userRepository.create({ Nombre: "Carlos" });
        const user3 = this.userRepository.create({ Nombre: "Melissa" });
        const user4 = this.userRepository.create({ Nombre: "John" });
        const user5 = this.userRepository.create({ Nombre: "Andrea" });
        const user6 = this.userRepository.create({ Nombre: "Julio" });
        const user7 = this.userRepository.create({ Nombre: "Carolina" });

        await this.userRepository.save(user1);
        await this.userRepository.save(user2);
        await this.userRepository.save(user3);
        await this.userRepository.save(user4);
        await this.userRepository.save(user5);
        await this.userRepository.save(user6);
        await this.userRepository.save(user7);
    }

    async crearProcesos() {
        const dominioTipoRutaFS = await this.dominioRepository.findOne({ where: { Clave: 'TIPO_RUTA_MANUAL', Descripcion: 'FILE SYSTEM' } })
        const dominioTipoRutaURL = await this.dominioRepository.findOne({ where: { Clave: 'TIPO_RUTA_MANUAL', Descripcion: 'URL' } })

        const manualAdmTelKey = this.procesoRepository.create({ NombreProceso: 'ADMINISTRACIÓN Y USO DEL TEL KEY', RutaManual: 'https://drive.google.com/uc?export=download&id=1_1WX9ooJuCq9kGPMKnVoOY1BgqML8IPU', TipoRutaManualId: dominioTipoRutaURL?.id });
        const manualAprobacionDoc = this.procesoRepository.create({ NombreProceso: 'APROBACIÓN DE DOCUMENTOS', RutaManual: 'https://drive.google.com/uc?export=download&id=1P1jB9jenvRPLGUTcVb6D2QZIgk0L71So', TipoRutaManualId: dominioTipoRutaURL?.id });
        const manualGestionInformacion = this.procesoRepository.create({ NombreProceso: 'GESTIÓN DE LA INFORMACIÓN DOCUMENTADA', RutaManual: 'C:/Users/evilela/Documents/PROYECTOS/EFLOW AI ASSISTANT NESTJS/eflow-ai-assistant/prompts/manuales', TipoRutaManualId: dominioTipoRutaFS?.id });
        const manualHelpdesk = this.procesoRepository.create({ NombreProceso: 'HELP DESK', RutaManual: 'C:/Users/evilela/Documents/PROYECTOS/EFLOW AI ASSISTANT NESTJS/eflow-ai-assistant/prompts/manuales/HELP DESK.pdf', TipoRutaManualId: dominioTipoRutaFS?.id });
        const manualRegistroSiniestros = this.procesoRepository.create({ NombreProceso: 'REGISTRO DE VACACIONES', RutaManual: 'C:/Users/evilela/Documents/PROYECTOS/EFLOW AI ASSISTANT NESTJS/eflow-ai-assistant/prompts/manuales/Registro de siniestros.pdf', TipoRutaManualId: dominioTipoRutaFS?.id });
        const manualRegistroVacaciones = this.procesoRepository.create({ NombreProceso: 'SOLICITUD DE VACACIONES', RutaManual: 'https://drive.google.com/uc?export=download&id=1dw25vFrFnVI1CuSRo6WdUsHcE_AvVr4C', TipoRutaManualId: dominioTipoRutaFS?.id });

        await this.procesoRepository.save(manualAdmTelKey);
        await this.procesoRepository.save(manualAprobacionDoc);
        await this.procesoRepository.save(manualGestionInformacion);
        await this.procesoRepository.save(manualHelpdesk);
        await this.procesoRepository.save(manualRegistroSiniestros);
        await this.procesoRepository.save(manualRegistroVacaciones);

    }


    async asignarProcesosAUsuarios(usuarios: UsuarioEntity[], procesos: ProcesoEntity[]) {


        for (let i = 0; i < 20; i++) {
            const randomIndexUsuarios = Math.floor(Math.random() * usuarios.length);
            const randomIndexProcesos = Math.floor(Math.random() * procesos.length);
            const randomUser = usuarios[randomIndexUsuarios];
            const randomProceso = procesos[randomIndexProcesos];
            const usuarioProcesoRecuperado = await this.usuarioProcesoRepository.findOne({ where: { ProcesoId: randomProceso.id, UsuarioId: randomUser.id, status: 1 } });
            if (!usuarioProcesoRecuperado) {
                const nuevoUsuarioProceso = this.usuarioProcesoRepository.create({ UsuarioId: randomUser.id, ProcesoId: randomProceso.id });
                await this.usuarioProcesoRepository.save(nuevoUsuarioProceso)
            }
        }

    }



}
