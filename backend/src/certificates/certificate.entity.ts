import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';

export enum CertificateStatus {
    PENDING = 'Pending',
    COMPLETED = 'Completed',
}

@Entity('certificates')
@Index('IDX_certificates_user_course', ['userId', 'courseId'])
export class Certificate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** Stable FK to courses.id — primary identity for a logical course. */
    @Column({ type: 'uuid', nullable: true })
    courseId: string | null;

    @ManyToOne(() => Course, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'courseId' })
    course: Course | null;

    /** Denormalized display title; kept in sync on course rename. Not used for identity. */
    @Column()
    courseName: string;

    // Added to store specific sub-module/topic name for 'Other' courses
    @Column({ nullable: true })
    subModule: string;

    @Column()
    provider: string;

    @Column({ type: 'int', default: 1 })
    monthNumber: number;

    @Column({
        type: 'enum',
        enum: CertificateStatus,
        default: CertificateStatus.PENDING,
    })
    status: CertificateStatus;

    @Column({ nullable: true })
    issuedAt: Date;

    @Column({ nullable: true, unique: true })
    registrationNo: string;

    @Column({ nullable: true }) // Generated UUID code for verification
    verificationCode: string;

    @Column({ nullable: true, select: false }) // Private file path
    filePath: string;

    @ManyToOne(() => User, (user) => user.certifications)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
