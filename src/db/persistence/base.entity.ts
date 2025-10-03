import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class BaseEntity {

    @PrimaryGeneratedColumn({ name: 'ID' })
    id: number;

    @Column({ name: 'STATUS', default: 1 })
    status: number;

    @Column({ name: 'CREATED_BY', default: 0 })
    createdBy: number;

    @CreateDateColumn({
        name: 'CREATED_AT',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP'
    })
    createdAt: Date;

    @Column({ name: 'UPDATED_BY', default: 0 })
    updatedBy: number;


    @CreateDateColumn({
        name: 'UPDATED_AT',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP'
    })
    updatedAt: Date;
} 