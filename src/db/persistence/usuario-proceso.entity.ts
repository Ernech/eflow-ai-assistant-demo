import { BaseEntity, Column, Entity } from "typeorm";
import { BaseDBEntity } from "./base-entity";

@Entity('USUARIO_PROCESO')
export class UsuarioProcesoEntity extends BaseDBEntity {

    @Column({ name: 'USUARIO_ID' })
    UsuarioId: number;

    @Column({ name: 'PROCESO_ID' })
    ProcesoId: number;

}