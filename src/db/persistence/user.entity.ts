import { BaseEntity, Column, Entity } from "typeorm";
import { BaseDBEntity } from "./base-entity";


@Entity('USUARIO')
export class UsuarioEntity extends BaseDBEntity {

    @Column({ name: 'NOMBRE', length: 500 })
    Nombre: string


}