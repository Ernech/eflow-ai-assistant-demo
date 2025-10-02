import { Injectable } from '@nestjs/common';
import { ManualInterface } from './interfaces/manual.interface';
import * as manuales from '../../data/manuales.json'
import fs from 'fs';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class ManualesService {

    private manuales: ManualInterface[]
    private manualesPath: string

    constructor(private configurationService: ConfigService) {
        const manualesString = JSON.stringify(manuales)
        this.manuales = JSON.parse(manualesString) as ManualInterface[];
        this.manualesPath = this.configurationService.get<string>('MANUALES_PATH') ?? "";
    }

    public recuperarManualPorId(manualId: number): ManualInterface {
        return this.manuales['default'].find((manual: ManualInterface) => manual.ManualId === manualId) ?? { ManualId: 0, FileId: "", NombreProceso: "" };
    }

    public recuperarManualPorNombre(nombreManual: string): ManualInterface {
        return this.manuales['default'].find((manual: ManualInterface) => manual.NombreProceso.toUpperCase() === nombreManual.toUpperCase()) ?? { ManualId: 0, FileId: "", NombreProceso: "" };
    }

    public actualizarFileId(manualId: number, fileId: string): void {
        const manualRecuperado = this.recuperarManualPorId(manualId);
        if (manualRecuperado.ManualId > 0) {
            manualRecuperado.FileId = fileId;
            const jsonString = JSON.stringify(this.manuales)
            fs.writeFileSync(this.manualesPath, jsonString, 'utf8');
        }
        throw new Error("Manual no encontrado")
    }

}
