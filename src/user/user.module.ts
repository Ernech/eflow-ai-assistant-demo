import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ManualesModule } from 'src/manuales/manuales.module';

@Module({
  imports: [ManualesModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController]
})
export class UserModule { }
