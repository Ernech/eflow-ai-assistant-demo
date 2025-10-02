import { Module } from '@nestjs/common';
import { AssistantModule } from './assistant/assistant.module';
import { ConfigModule } from '@nestjs/config';
import { PdfModule } from './pdf/pdf.module';
import { PromptModule } from './prompt/prompt.module';
import { DocModule } from './doc/doc.module';
import { UserModule } from './user/user.module';
import { ManualesModule } from './manuales/manuales.module';
import configuration from 'src/config/configuration';



@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            load: [configuration]
        }),
        AssistantModule,
        PdfModule,
        PromptModule,
        DocModule,
        UserModule,
        ManualesModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
