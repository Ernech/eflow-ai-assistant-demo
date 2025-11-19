import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiResponse } from '@nestjs/swagger';
import { UserResponseDTO } from './dto/user-response.dto';

@Controller('user')
export class UserController {

    constructor(
        private readonly userService: UserService
    ) { }

    @Get('/all')
    @ApiResponse({
        status: 200,
        description: 'Regresa una lista de usuarios con sus procesos asociados',
        type: [UserResponseDTO]
    })
    public getAllUsers() {
        return this.userService.recuperarUsuarioConManuales();
    }
}
