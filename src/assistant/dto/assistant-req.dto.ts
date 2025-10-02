import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class AssistantReqDTO {


    @ApiProperty({
        description: 'Id del usuario de eflow',
        nullable: false
    })
    @IsNumber()
    @IsNotEmpty()
    IdUsuario: number;

    @ApiProperty({
        description: 'Mensaje para la ia',
        nullable: false,
        minLength: 1,
        maxLength: 100
    })
    @IsString({ each: true })
    @IsNotEmpty()
    Mensaje: string;


}