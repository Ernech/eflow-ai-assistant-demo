import { Column, Entity } from "typeorm";
import { BaseDBEntity } from "./base-entity";


@Entity('PROCESO')
export class ProcesoEntity extends BaseDBEntity {

    @Column({ name: 'NOMBRE', length: 200 })
    NombreProceso: string;

    @Column({ name: 'RUTA_MANUAL', length: 500 })
    RutaManual: string;

    @Column({ name: 'TIPO_RUTA_MANUAL_ID' })
    TipoRutaManualId: number;

}