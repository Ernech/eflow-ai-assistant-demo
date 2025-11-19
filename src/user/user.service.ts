import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserInterface } from './interfaces/users.interface';
import * as users from '../../data/users.json';
import { ManualesService } from 'src/manuales/manuales.service';
import { UserResponseDTO } from './dto/user-response.dto';
@Injectable()
export class UserService {

    private usersList: UserInterface[];

    constructor(private manualesService: ManualesService) {
        const usersListString = JSON.stringify(users)
        this.usersList = JSON.parse(usersListString) as UserInterface[];
    }

    public recuperarUsuarioPorId(userId: number): UserInterface {
        return this.usersList['default'].find((user: UserInterface) => user.Id === userId) ?? { Id: 0, Nombre: "", Procesos: [] };
    }

    public recuperarUsuarioConManuales(): UserResponseDTO[] {
        return this.usersList['default'].map((user: UserInterface) => {
            const userResponse = new UserResponseDTO();
            userResponse.Id = user.Id;
            userResponse.Nombre = user.Nombre;
            userResponse.Manuales = user.Procesos.map(procesoId => this.manualesService.recuperarManualPorId(procesoId));
            return userResponse;
        });
    }

}
