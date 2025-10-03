import { BaseEntity, Column, Entity } from "typeorm";

@Entity('USUARIO_PROCESO')
export class UsuarioProcesoEntity extends BaseEntity {

    @Column({ name: 'USUARIO_ID' })
    UsuarioId: number;

    @Column({ name: 'PROCESO_ID' })
    ProcesoId: number;

}