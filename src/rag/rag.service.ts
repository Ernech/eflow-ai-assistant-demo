import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { catchError, firstValueFrom, map, Observable } from 'rxjs';
import { RagRequest, RagResponse } from 'src/assistant/interfaces/rag.interface';

@Injectable()
export class RagService {

    private ragBaseUrl: string;

    constructor(
        private configService: ConfigService,
        private readonly httpService: HttpService) {
        this.ragBaseUrl = this.configService.get<string>('RAG_SERVER_PATH') ?? '';
    }


    public async getRagContext(ragRequest: RagRequest): Promise<RagResponse> {
        return await firstValueFrom(this.httpService.post<RagResponse>(`${this.ragBaseUrl}/rag/query`, JSON.stringify(ragRequest), {
            headers: {
                'Content-Type': 'application/json',
            }
        }).pipe(
            map(response => response.data),
            catchError(error => { throw new Error(`No se pudo recuperar la información de contexto ${error}`) })
        ));

    }



}
