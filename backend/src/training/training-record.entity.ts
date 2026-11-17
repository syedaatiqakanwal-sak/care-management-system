import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

export enum TrainingStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
}

@Entity('training_records')
@Index('IDX_training_records_user_course', ['userId', 'courseId'])
export class TrainingRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    /** Stable FK to courses.id — primary identity for a logical course. */
    @Column({ type: 'uuid', nullable: true })
    courseId: string | null;

    @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'courseId' })
    course: Course | null;

    /** Denormalized display title; kept in sync on course rename. Not used for identity. */
    @Column()
    courseName: string;

    // New column to store the specific sub-module/topic (e.g. for "Other" category courses)
    @Column({ nullable: true })
    subModule: string;

    @Column({
        type: 'enum',
        enum: TrainingStatus,
        default: TrainingStatus.PENDING
    })
    status: TrainingStatus;

    @Column({ type: 'timestamp', nullable: true })
    enrollmentDate: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    dueDate: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
