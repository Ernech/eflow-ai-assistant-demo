import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsString } from "class-validator";

export class AssistantResDTO {

    @ApiProperty()
    @IsNumber()
    Codigo: number

    @ApiProperty()
    @IsString()
    Mensaje: string

    @ApiProperty()
    @IsBoolean()
    Respuesta: boolean
}