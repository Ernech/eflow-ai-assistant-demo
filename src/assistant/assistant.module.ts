import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { PdfModule } from 'src/pdf/pdf.module';
import { PromptModule } from 'src/prompt/prompt.module';
import { DocModule } from 'src/doc/doc.module';
import { UserModule } from 'src/user/user.module';
import { ManualesModule } from 'src/manuales/manuales.module';

@Module({
  controllers: [AssistantController],
  providers: [AssistantService],
  imports: [PdfModule, PromptModule, DocModule, UserModule, ManualesModule]
})
export class AssistantModule { }
