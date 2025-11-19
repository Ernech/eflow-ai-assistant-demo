import { IsNumber, IsString } from "class-validator";
import { ManualInterface } from "src/manuales/interfaces/manual.interface";

export class UserResponseDTO {

    @IsNumber()
    Id: number;

    @IsString()
    Nombre: string;

    Manuales: ManualInterface[]

}