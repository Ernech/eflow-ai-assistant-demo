import { Body, Controller, Param, ParseIntPipe, Post, Res } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantReqDTO } from './dto/assistant-req.dto';
import { ApiResponse } from '@nestjs/swagger';
import { AssistantResDTO } from './dto/assistant-res.dto';
import type { Response } from "express";

@Controller('assistant')
export class AssistantController {
    constructor(private assistantService: AssistantService) { }

    @Post("consultar")
    @ApiResponse({
        status: 200,
        description: 'Regresa la respuesta',
        type: AssistantResDTO
    })
    async consultarAsistente(@Body() assistantReqDTO: AssistantReqDTO) {
        return await this.assistantService.consultarAsistente(assistantReqDTO)
    }
    @Post("consultar/proceso/inicio")
    @ApiResponse({
        status: 200,
        description: 'Regresa la respuesta',
        type: AssistantResDTO
    })
    async consultarAsistenteInicioProceso(@Body() assistantReqDTO: AssistantReqDTO) {
        return await this.assistantService.ConsultarProcesoAIniciarRag(assistantReqDTO)
    }

    @Post("consultar/proceso/:id")
    @ApiResponse({
        status: 200,
        description: 'Regresa la respuesta',
        type: AssistantResDTO
    })
    async consultarAsistenteProceso(@Param('id', ParseIntPipe) manualId: number, @Body() assistantReqDTO: AssistantReqDTO) {
        return await this.assistantService.ConsultarManualProcesoRag(manualId, assistantReqDTO)
    }


    @Post("consultar-doc-eflow-stream")
    @ApiResponse({
        status: 200,
        description: 'Consulta al asistente acerca de un proceso en específico en formato stream',
        type: AssistantResDTO
    })
    async consultarDocumentoEflowStream(
        @Body() assistantReqDTO: AssistantReqDTO,
        @Res() res: Response
    ) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        try {
            const stream = await this.assistantService.ConsultarDocumentoEflowStreamGemini(
                assistantReqDTO
            );

            for await (const chunk of stream) {
                const text = chunk.text;
                if (text) {
                    res.write(`data: ${text}\n\n`);
                }
            }

            res.write("event: end\n\n");
            res.end();
        } catch (error) {
            res.write(
                `event: error\ndata: ${JSON.stringify({
                    message: error?.message ?? "Error interno",
                })}\n\n`
            );
            res.end();
        }
    }

    @Post("rag/consultar-doc-eflow")
    @ApiResponse({
        status: 200,
        description: 'Consulta al asistente acerca dela herramienta de eflow con la arquitectura rag',
        type: AssistantResDTO
    })
    async consultarManualEflowRag(@Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.ConsultarManualEflowRag(assistantReqDTO);
    }

    @Post("rag/ollama/consultar-doc-eflow")
    @ApiResponse({
        status: 200,
        description: 'Respuesta exitosa a la consulta',
        type: AssistantResDTO
    })
    async consultarManualEflowRagOllama(@Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.ConsultarManualEflowRagOllama(assistantReqDTO);
    }
}
