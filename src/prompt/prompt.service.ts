import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptService {

    public ObtenerSeccion(lineasTexto: string[], tituloSeccion: string): string {
        let indexSeccion = lineasTexto
            .findIndex(
                linea => linea.toLowerCase()
                    .startsWith(tituloSeccion.toLowerCase()));

        if (indexSeccion < 0) return "";
        let contenido: string[] = [];
        for (let i = indexSeccion + 1; i < lineasTexto.length; i++) {
            if (Number(lineasTexto[i][0]) && lineasTexto[i].includes('.'))
                break;
            contenido.push(lineasTexto[i]);
        }
        return contenido.join(' ');
    }
}
