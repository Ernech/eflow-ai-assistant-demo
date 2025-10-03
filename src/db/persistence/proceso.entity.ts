import { BaseEntity, Column, Entity } from "typeorm";


@Entity('PROCESO')
export class ProcesoEntity extends BaseEntity {

    @Column({ name: 'NOMBRE', length: 200 })
    NombreProceso: string;

    @Column({ name: 'DESCRIPCION', length: 1000 })
    DescripcionProceso: string;

    @Column({ name: 'RUTA_MANUAL' })
    RutaManual: number;

}