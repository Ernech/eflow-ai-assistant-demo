import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [RagService],
  exports: [RagService]
})
export class RagModule { }
