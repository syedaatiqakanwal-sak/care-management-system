import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Course } from './course.entity';
import { TrainingRecord, TrainingStatus } from '../training/training-record.entity';
import { Certificate, CertificateStatus } from '../certificates/certificate.entity';

/**
 * Migration-only historical title aliases.
 * Used solely to resolve legacy rows onto a stable courseId.
 * Runtime business logic must use courseId, not these strings.
 */
export const HISTORICAL_COURSE_TITLE_ALIASES: Record<string, string> = {
    'Prevent Training and Competencies': 'Certificate in Prevent Training and Competencies',
    'Certificate in Equality Diversity and Inclusion in Care Setting':
        'Certificate in Equality Diversity and Human Rights',
    'Certificate in Equality Diversity and Inclusion in Care Settings':
        'Certificate in Equality Diversity and Human Rights',
    'Certificate in Tier 1 of the Oliver McGowan Mandatory Training on Learning Disability and Autism':
        'Tier 1 of the Oliver McGowan Mandatory Training on Learning Disability and Autism',
    'Certificate in Communication in Care Settings': 'Certificate in Communication in Care Setting',
};

export function submoduleKey(subModule?: string | null): string {
    return subModule ?? '';
}

@Injectable()
export class CourseIdentityService {
    private readonly logger = new Logger(CourseIdentityService.name);
    private titleCache: Map<string, string> | null = null;

    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        @InjectRepository(TrainingRecord)
        private readonly trainingRepository: Repository<TrainingRecord>,
        @InjectRepository(Certificate)
        private readonly certificateRepository: Repository<Certificate>,
    ) {}

    async invalidateCache(): Promise<void> {
        this.titleCache = null;
    }

    private async ensureTitleCache(): Promise<Map<string, string>> {
        if (this.titleCache) return this.titleCache;
        const courses = await this.courseRepository.find({ select: ['id', 'title'] });
        const map = new Map<string, string>();
        for (const c of courses) {
            map.set(c.title, c.id);
        }
        this.titleCache = map;
        return map;
    }

    /**
     * Resolve a free-text course title to a stable courses.id.
     * Exact match → historical alias → Certificate-in prefix normalization.
     */
    async resolveCourseId(courseName: string | null | undefined): Promise<string | null> {
        if (!courseName || !courseName.trim()) return null;
        const title = courseName.trim();
        const cache = await this.ensureTitleCache();

        if (cache.has(title)) return cache.get(title)!;

        const aliased = HISTORICAL_COURSE_TITLE_ALIASES[title];
        if (aliased && cache.has(aliased)) return cache.get(aliased)!;

        if (title.startsWith('Certificate in ')) {
            const stripped = title.slice('Certificate in '.length);
            if (cache.has(stripped)) return cache.get(stripped)!;
            const aliasedStripped = HISTORICAL_COURSE_TITLE_ALIASES[stripped];
            if (aliasedStripped && cache.has(aliasedStripped)) return cache.get(aliasedStripped)!;
        } else {
            const prefixed = `Certificate in ${title}`;
            if (cache.has(prefixed)) return cache.get(prefixed)!;
        }

        return null;
    }

    async getCourseTitle(courseId: string): Promise<string | null> {
        const course = await this.courseRepository.findOne({
            where: { id: courseId },
            select: ['id', 'title'],
        });
        return course?.title ?? null;
    }

    /**
     * Find the single training row for a logical course (+ optional sub-module).
     * Prefers courseId; falls back to courseName only when courseId is unresolved.
     */
    async findTrainingRecord(
        userId: string,
        opts: { courseId?: string | null; courseName?: string | null; subModule?: string | null },
    ): Promise<TrainingRecord | null> {
        const subModule = opts.subModule || null;
        const subClause = subModule ? { subModule } : { subModule: IsNull() };

        if (opts.courseId) {
            const byId = await this.trainingRepository.findOne({
                where: { userId, courseId: opts.courseId, ...subClause },
            });
            if (byId) return byId;
        }

        if (opts.courseName) {
            const byName = await this.trainingRepository.findOne({
                where: { userId, courseName: opts.courseName, ...subClause },
            });
            if (byName) return byName;
        }

        return null;
    }

    /**
     * All training rows for a logical course (any sub-module / historical title).
     */
    async findAllTrainingForCourse(
        userId: string,
        courseId: string | null | undefined,
        fallbackCourseName?: string | null,
    ): Promise<TrainingRecord[]> {
        if (courseId) {
            return this.trainingRepository.find({ where: { userId, courseId } });
        }
        if (fallbackCourseName) {
            return this.trainingRepository.find({
                where: { userId, courseName: fallbackCourseName },
            });
        }
        return [];
    }

    /**
     * Revert every training row for the certificate's logical course to PENDING.
     */
    async revertTrainingForCertificate(cert: Certificate): Promise<number> {
        let courseId = cert.courseId;
        if (!courseId) {
            courseId = await this.resolveCourseId(cert.courseName);
            if (courseId) {
                cert.courseId = courseId;
                await this.certificateRepository.save(cert);
            }
        }

        const records = await this.findAllTrainingForCourse(cert.userId, courseId, cert.courseName);

        // Also catch sibling rows that share the resolved courseId via name resolution
        // but were never backfilled (courseId still null on those rows).
        if (courseId) {
            const allUserRows = await this.trainingRepository.find({ where: { userId: cert.userId } });
            for (const row of allUserRows) {
                if (row.courseId === courseId) continue;
                if (records.some((r) => r.id === row.id)) continue;
                const resolved = row.courseId || (await this.resolveCourseId(row.courseName));
                if (resolved === courseId) {
                    records.push(row);
                }
            }
        }

        let updated = 0;
        for (const record of records) {
            const needsUpdate =
                record.status !== TrainingStatus.PENDING ||
                record.completedAt !== null ||
                (courseId && record.courseId !== courseId);
            if (!needsUpdate) continue;

            record.status = TrainingStatus.PENDING;
            record.completedAt = null;
            if (courseId) {
                record.courseId = courseId;
                const title = await this.getCourseTitle(courseId);
                if (title) record.courseName = title;
            }
            await this.trainingRepository.save(record);
            updated += 1;
        }

        this.logger.log(
            `Reverted ${updated} training row(s) for user=${cert.userId} courseId=${courseId || 'null'} cert=${cert.id}`,
        );
        return updated;
    }

    /**
     * Sync a completed certificate onto exactly one training row for that logical course.
     */
    async syncCompletedCertificateToTraining(cert: Certificate): Promise<TrainingRecord> {
        let courseId = cert.courseId;
        if (!courseId) {
            courseId = await this.resolveCourseId(cert.courseName);
            if (courseId) {
                cert.courseId = courseId;
                await this.certificateRepository.save(cert);
            }
        }

        const canonicalTitle =
            (courseId ? await this.getCourseTitle(courseId) : null) || cert.courseName;
        const subModule = cert.subModule || null;

        let record = await this.findTrainingRecord(cert.userId, {
            courseId,
            courseName: cert.courseName,
            subModule,
        });

        // Collapse any other rows for the same logical course + subModule into this one
        if (courseId) {
            const siblings = await this.trainingRepository.find({
                where: { userId: cert.userId, courseId },
            });
            const matching = siblings.filter(
                (r) => submoduleKey(r.subModule) === submoduleKey(subModule),
            );
            if (!record && matching.length > 0) {
                record = matching[0];
            }
            for (const extra of matching) {
                if (!record || extra.id === record.id) continue;
                // Merge useful dates then delete duplicate
                if (!record.enrollmentDate && extra.enrollmentDate) {
                    record.enrollmentDate = extra.enrollmentDate;
                }
                if (
                    extra.completedAt &&
                    (!record.completedAt || extra.completedAt < record.completedAt)
                ) {
                    // keep earliest completion if already set; cert issuedAt preferred below
                }
                await this.trainingRepository.delete({ id: extra.id });
            }
        }

        if (!record) {
            record = this.trainingRepository.create({
                userId: cert.userId,
                courseName: canonicalTitle,
                courseId: courseId || null,
                status: TrainingStatus.COMPLETED,
                completedAt: cert.issuedAt || new Date(),
                subModule,
            } as any) as unknown as TrainingRecord;
        } else {
            record.status = TrainingStatus.COMPLETED;
            if (!record.completedAt) {
                record.completedAt = cert.issuedAt || new Date();
            }
            if (courseId) record.courseId = courseId;
            record.courseName = canonicalTitle;
            if (subModule) record.subModule = subModule;
        }

        return this.trainingRepository.save(record);
    }

    /**
     * After a catalog rename, keep denormalized titles in sync without creating new identities.
     */
    async propagateTitleRename(courseId: string, newTitle: string): Promise<void> {
        await this.trainingRepository.update({ courseId }, { courseName: newTitle });
        await this.certificateRepository.update({ courseId }, { courseName: newTitle });
        await this.invalidateCache();
        this.logger.log(`Propagated title rename for courseId=${courseId} → "${newTitle}"`);
    }

    /**
     * Ensure courseId is set on a training/certificate row when possible.
     */
    async ensureCourseIdOnTraining(record: TrainingRecord): Promise<TrainingRecord> {
        if (record.courseId) return record;
        const courseId = await this.resolveCourseId(record.courseName);
        if (!courseId) return record;
        record.courseId = courseId;
        const title = await this.getCourseTitle(courseId);
        if (title) record.courseName = title;
        return this.trainingRepository.save(record);
    }

    async ensureCourseIdOnCertificate(cert: Certificate): Promise<Certificate> {
        if (cert.courseId) return cert;
        const courseId = await this.resolveCourseId(cert.courseName);
        if (!courseId) return cert;
        cert.courseId = courseId;
        const title = await this.getCourseTitle(courseId);
        if (title) cert.courseName = title;
        return this.certificateRepository.save(cert);
    }
}
