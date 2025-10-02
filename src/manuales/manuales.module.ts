import { Module } from '@nestjs/common';
import { ManualesService } from './manuales.service';

@Module({
  providers: [ManualesService],
  exports: [ManualesService]
})
export class ManualesModule { }
