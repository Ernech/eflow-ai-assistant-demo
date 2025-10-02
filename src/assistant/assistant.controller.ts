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
        return this.assistantService.consultarAsistente(assistantReqDTO)
    }

    @Post("consultar/pdf")
    @ApiResponse({
        status: 200,
        description: 'Regresa la respuesta',
        type: AssistantResDTO
    })
    async consultarAsistentePDF(@Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.consultarAsistentePdf(assistantReqDTO)
    }

    @Post("consultar/doc")
    @ApiResponse({
        status: 200,
        description: 'Regresa la respuesta',
        type: AssistantResDTO
    })
    async consultarAsistenteDoc(@Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.ConsultarAsistenteDoc(assistantReqDTO)
    }

    @Post("consultar/manuales")
    @ApiResponse({
        status: 200,
        description: 'Consulta basada en los manuales de procesos del eflow',
        type: AssistantResDTO
    })
    async consultarAsistenteManuales(@Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.ConsultarManualesPfd(assistantReqDTO)
    }

    @Post("consultar/manuales/gemini")
    @ApiResponse({
        status: 200,
        description: 'Consulta basada en los manuales de procesos del eflow con gemini',
        type: AssistantResDTO
    })
    async consultarAsistenteManualeGemini(@Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.ConsultarAsistenteGemini(assistantReqDTO)
    }

    @Post("consultar/proceso/:id")
    @ApiResponse({
        status: 200,
        description: 'Consulta al asistente acerca de un proceso en específico',
        type: AssistantResDTO
    })
    async consultarAsistenteProceso(@Param("id", ParseIntPipe) id: number, @Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.ConsultarManual(id, assistantReqDTO)
    }

    @Post("consultar/proceso/gemini/:id")
    @ApiResponse({
        status: 200,
        description: 'Consulta al asistente acerca de un proceso en específico',
        type: AssistantResDTO
    })
    async consultarAsistenteProcesoGemini(@Param("id", ParseIntPipe) id: number, @Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.ConsultarDocumentoGemini(id, assistantReqDTO)
    }

    @Post("consultar-stream")
    @ApiResponse({
        status: 200,
        description: 'Consulta al asistente acerca de un proceso en específico en formato stream',
        type: AssistantResDTO
    })
    async consultarAsistenteStream(
        @Body() assistantReqDTO: AssistantReqDTO,
        @Res() res: Response
    ) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        try {
            const stream = await this.assistantService.ConsultarAsistenteGeminiStream(
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

    @Post("consultar-doc-stream")
    @ApiResponse({
        status: 200,
        description: 'Consulta al asistente acerca de un proceso en específico en formato stream',
        type: AssistantResDTO
    })
    async consultarDocumentoStream(
        @Param("id", ParseIntPipe) id: number,
        @Body() assistantReqDTO: AssistantReqDTO,
        @Res() res: Response
    ) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        try {
            const stream = await this.assistantService.ConsultarDocumentoStreamGemini(id,
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

    @Post("consultar-doc-eflow")
    @ApiResponse({
        status: 200,
        description: 'Consulta al asistente acerca dela herramienta de eflow',
        type: AssistantResDTO
    })
    async consultarManualEflow(@Body() assistantReqDTO: AssistantReqDTO) {
        return this.assistantService.ConsultarManualEflow(assistantReqDTO);
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
}
