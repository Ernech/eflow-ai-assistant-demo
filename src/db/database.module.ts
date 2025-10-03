import { Module } from '@nestjs/common';
import { databaseProviders } from './database.providers';
import { repositoryProviders } from './persistence/repository.providers';

@Module({
    providers: [...databaseProviders, ...repositoryProviders],
    exports: [...databaseProviders, ...repositoryProviders]
})
export class DatabaseModule { };