import { RepositoryEnum } from "src/enum/repository.enum";
import { DataSource } from "typeorm";
import { UsuarioEntity } from "./user.entity";
import { ProcesoEntity } from "./proceso.entity";
import { UsuarioProcesoEntity } from "./usuario-proceso.entity";
import { DominiosEntity } from "./dominio.entity";


export const repositoryProviders = [
    {
        provide: RepositoryEnum.USUARIO,
        useFactory: (dataSource: DataSource) => dataSource.getRepository(UsuarioEntity),
        inject: [DataSource],
    },
    {
        provide: RepositoryEnum.PROCESO,
        useFactory: (datasource: DataSource) => datasource.getRepository(ProcesoEntity),
        inject: [DataSource]
    },
    {
        provide: RepositoryEnum.USUARIO_PROCESO,
        useFactory: (datasource: DataSource) => datasource.getRepository(UsuarioProcesoEntity),
        inject: [DataSource]
    },
    {
        provide: RepositoryEnum.DOMINIO,
        useFactory: (datasource: DataSource) => datasource.getRepository(DominiosEntity),
        inject: [DataSource]
    }

]