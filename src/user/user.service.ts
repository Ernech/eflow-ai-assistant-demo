import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserInterface } from './interfaces/users.interface';
import * as users from '../../data/users.json';
@Injectable()
export class UserService {

    private usersList: UserInterface[];

    constructor() {
        const usersListString = JSON.stringify(users)
        this.usersList = JSON.parse(usersListString) as UserInterface[];
    }

    public recuperarUsuarioPorId(userId: number): UserInterface {
        return this.usersList['default'].find((user: UserInterface) => user.Id === userId) ?? { Id: 0, Nombre: "", Procesos: [] };
    }

}
