import { BaseEntity, Column, Entity } from "typeorm";
import { BaseDBEntity } from "./base-entity";


@Entity('DOMINIOS')
export class DominiosEntity extends BaseDBEntity {

    @Column({ name: 'CLAVE', length: 350 })
    Clave: string;

    @Column({ name: 'VALOR' })
    Valor: number;

    @Column({ name: 'DESCRIPCION', length: 350 })
    Descripcion: string;

}