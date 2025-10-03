import { BaseEntity, Column, Entity } from "typeorm";


@Entity('USUARIO')
export class UsuarioEntity extends BaseEntity {

    @Column({ name: 'NOMBRE', length: 500 })
    Nombre: string


}