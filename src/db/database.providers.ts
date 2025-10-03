import { DataSource } from 'typeorm';

export const databaseProviders = [
    {
        provide: DataSource,
        useFactory: async () => {
            const dataSource = new DataSource({
                name: 'postgres',
                type: 'postgres',
                host: process.env.DB_HOST,
                port: 5432,
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                synchronize: true,
                entities: [__dirname + '/persistence/*.entity{.ts,.js}']
            });

            return dataSource.initialize();
        },
    },
];