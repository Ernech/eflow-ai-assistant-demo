import { BaseEntity, Column, Entity } from "typeorm";


@Entity('DOMINIOS')
export class DominiosEntity extends BaseEntity {

    @Column({ name: 'CLAVE', length: 350 })
    Clave: string;

    @Column({ name: 'VALOR' })
    Valor: number;

    @Column({ name: 'DESCRIPCION', length: 350 })
    Descripcion: string;

}