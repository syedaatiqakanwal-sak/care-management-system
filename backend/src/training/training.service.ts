import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { TrainingRecord, TrainingStatus } from './training-record.entity';
import { Certificate, CertificateStatus } from '../certificates/certificate.entity';
import { CourseIdentityService, submoduleKey } from '../courses/course-identity.service';
import { CertificatesService } from '../certificates/certificates.service';

@Injectable()
export class TrainingService {
    private readonly logger = new Logger(TrainingService.name);

    constructor(
        @InjectRepository(TrainingRecord)
        private trainingRepository: Repository<TrainingRecord>,
        @InjectRepository(Certificate)
        private certificateRepository: Repository<Certificate>,
        private readonly courseIdentityService: CourseIdentityService,
        @Inject(forwardRef(() => CertificatesService))
        private readonly certificatesService: CertificatesService,
    ) { }

    async findAllForUser(userId: string): Promise<TrainingRecord[]> {
        // Sync first to ensure data consistency
        await this.syncCertificatesToTraining(userId);

        return this.trainingRepository.find({
            where: { userId },
            order: { courseName: 'ASC' }
        });
    }

    /**
     * Backfill / sync: each Completed certificate maps to exactly one training row
     * for that logical course (courseId), never creating duplicate completed rows.
     */
    async syncCertificatesToTraining(userId: string) {
        const certificates = await this.certificateRepository.find({
            where: { userId, status: CertificateStatus.COMPLETED }
        });

        for (const cert of certificates) {
            await this.courseIdentityService.syncCompletedCertificateToTraining(cert);
        }
    }

    /**
     * Unenroll: keep the course on the training plan, but reset to Pending
     * with empty enrollment/completion dates. Also revert any Completed certificate
     * so sync does not reinstate completion.
     */
    async deleteRecord(userId: string, recordId: string): Promise<void> {
        const record = await this.trainingRepository.findOne({ where: { id: recordId, userId } });
        if (!record) {
            throw new NotFoundException(`Training record not found for user ${userId}`);
        }

        const relatedCerts = await this.certificateRepository.find({ where: { userId } });
        const matchingCerts = relatedCerts.filter((cert) => {
            const sameCourse =
                (record.courseId && cert.courseId && cert.courseId === record.courseId) ||
                cert.courseName === record.courseName ||
                (!!record.subModule && cert.courseName === record.subModule);
            const sameSub =
                submoduleKey(cert.subModule) === submoduleKey(record.subModule);
            return sameCourse && sameSub;
        });

        for (const cert of matchingCerts) {
            if (cert.status === CertificateStatus.COMPLETED) {
                if (cert.filePath && fs.existsSync(cert.filePath)) {
                    try {
                        fs.unlinkSync(cert.filePath);
                    } catch (err: any) {
                        this.logger.error(`Failed to delete certificate file: ${err?.message ?? err}`);
                    }
                }
                cert.status = CertificateStatus.PENDING;
                (cert as any).filePath = null;
                (cert as any).verificationCode = null;
                (cert as any).issuedAt = null;
                await this.certificateRepository.save(cert);
                this.logger.log(
                    `Reverted completed certificate ${cert.id} while unenrolling training ${recordId}`,
                );
            }
        }

        record.status = TrainingStatus.PENDING;
        record.enrollmentDate = null;
        record.completedAt = null;
        await this.trainingRepository.save(record);
    }

    async upsertRecord(
        userId: string,
        courseName: string,
        data: {
            enrollmentDate?: Date | null;
            completedAt?: Date | null;
            subModule?: string;
            courseId?: string | null;
        },
        actor?: any,
    ) {
        let courseId = data.courseId || null;
        if (!courseId) {
            courseId = await this.courseIdentityService.resolveCourseId(courseName);
        }

        const canonicalTitle =
            (courseId ? await this.courseIdentityService.getCourseTitle(courseId) : null) ||
            courseName;

        const subModule = data.subModule || null;

        let record = await this.courseIdentityService.findTrainingRecord(userId, {
            courseId,
            courseName,
            subModule,
        });

        // Collapse historical title duplicates into one logical row
        if (courseId && record) {
            const siblings = await this.trainingRepository.find({
                where: { userId, courseId },
            });
            for (const sibling of siblings) {
                if (sibling.id === record.id) continue;
                if (submoduleKey(sibling.subModule) !== submoduleKey(subModule)) continue;
                if (!record.enrollmentDate && sibling.enrollmentDate) {
                    record.enrollmentDate = sibling.enrollmentDate;
                }
                if (
                    sibling.status === TrainingStatus.COMPLETED &&
                    sibling.completedAt &&
                    (!record.completedAt || sibling.completedAt < record.completedAt)
                ) {
                    record.completedAt = sibling.completedAt;
                    record.status = TrainingStatus.COMPLETED;
                }
                await this.trainingRepository.delete({ id: sibling.id });
                this.logger.log(`Merged duplicate training ${sibling.id} into ${record.id}`);
            }
        }

        if (!record) {
            record = this.trainingRepository.create({
                userId,
                courseName: canonicalTitle,
                courseId,
                status: TrainingStatus.PENDING,
                subModule,
            } as any) as unknown as TrainingRecord;
        }

        const validRecord = record!;

        if (courseId) {
            validRecord.courseId = courseId;
            validRecord.courseName = canonicalTitle;
        } else {
            validRecord.courseName = courseName;
        }

        if (data.enrollmentDate !== undefined) {
            validRecord.enrollmentDate = data.enrollmentDate;
        }

        if (data.completedAt !== undefined) {
            validRecord.completedAt = data.completedAt;
            validRecord.status = data.completedAt ? TrainingStatus.COMPLETED : TrainingStatus.PENDING;
        }

        if (data.subModule !== undefined) {
            (validRecord as any).subModule = data.subModule || null;
        }

        const saved = await this.trainingRepository.save(validRecord);

        // A completion date is the certificate date. Saving it completes the
        // certificate; clearing it puts the certificate back to Pending.
        if (data.completedAt !== undefined) {
            await this.certificatesService.applyTrainingCompletion(saved, actor);
        }

        return saved;
    }
}
