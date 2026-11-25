import {
    Injectable,
    NotFoundException,
    InternalServerErrorException,
    Logger,
    ForbiddenException,
    OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Certificate, CertificateStatus } from '../certificates/certificate.entity';
import { User, UserRole } from '../users/user.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { TrainingRecord, TrainingStatus } from '../training/training-record.entity';
import { Course } from '../courses/course.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class IsolatedCertificatesService implements OnModuleDestroy {
    private readonly logger = new Logger(IsolatedCertificatesService.name);

    // Reusable Puppeteer Singleton & Concurrency Limiter (Max 4 concurrent browser renders)
    private browser: any = null;
    private browserLaunchPromise: Promise<any> | null = null;
    private activeRenders = 0;
    private readonly maxConcurrentRenders = 4;
    private renderQueue: Array<() => void> = [];

    constructor(
        @InjectRepository(Certificate)
        private certificatesRepository: Repository<Certificate>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(StaffProfile)
        private staffProfileRepository: Repository<StaffProfile>,
        @InjectRepository(TrainingRecord)
        private trainingRepository: Repository<TrainingRecord>,
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
        private jwtService: JwtService,
    ) { }

    async onModuleDestroy() {
        if (this.browser) {
            await this.browser.close().catch(() => {});
            this.browser = null;
        }
    }

    private async acquireRenderSlot(): Promise<void> {
        if (this.activeRenders < this.maxConcurrentRenders) {
            this.activeRenders++;
            return;
        }
        return new Promise<void>((resolve) => {
            this.renderQueue.push(() => {
                this.activeRenders++;
                resolve();
            });
        });
    }

    private releaseRenderSlot(): void {
        this.activeRenders--;
        if (this.renderQueue.length > 0) {
            const next = this.renderQueue.shift();
            if (next) next();
        }
    }

    private async getBrowser(): Promise<any> {
        if (this.browser && this.browser.isConnected()) {
            return this.browser;
        }
        if (this.browserLaunchPromise) {
            return this.browserLaunchPromise;
        }

        this.browserLaunchPromise = (async () => {
            try {
                const puppeteerMod = await import('puppeteer');
                const puppeteer = puppeteerMod.default || puppeteerMod;
                const instance = await puppeteer.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                    ],
                });
                instance.on('disconnected', () => {
                    this.logger.warn('Puppeteer browser disconnected. Will respawn on next request.');
                    this.browser = null;
                });
                this.browser = instance;
                return instance;
            } finally {
                this.browserLaunchPromise = null;
            }
        })();

        return this.browserLaunchPromise;
    }

    /**
     * Canonical title normalizer to prevent duplicate cards caused by naming variations
     */
    private normalizeCourseName(name: string): string {
        if (!name) return '';
        let cleaned = name.trim().toLowerCase();
        // Remove "certificate in " prefix
        cleaned = cleaned.replace(/^certificate\s+in\s+/i, '');
        // Known aliases
        if (
            cleaned === 'equality diversity and inclusion in care setting' ||
            cleaned === 'equality diversity and inclusion in care settings' ||
            cleaned === 'equality diversity and human rights'
        ) {
            cleaned = 'equality diversity and human rights';
        }
        if (
            cleaned === 'prevent training and competencies' ||
            cleaned === 'prevent training & competencies'
        ) {
            cleaned = 'prevent training and competencies';
        }
        if (cleaned.includes('oliver mcgowan')) {
            cleaned = 'oliver mcgowan mandatory training';
        }
        return cleaned.replace(/\s+/g, ' ').trim();
    }

    /**
     * Read-only: Get all staff members with enrolled courses count and completed count
     * Excludes:
     *  - Courses starting with "Standard"
     *  - Uncompleted courses without enrollment dates or with future enrollment dates
     */
    async getStaffList() {
        const staffProfiles = await this.staffProfileRepository.find({
            relations: ['user'],
            order: { firstName: 'ASC' },
        });

        // Filter for active staff users
        const validProfiles = staffProfiles.filter((p) => p.user && p.user.role === UserRole.STAFF);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Fetch all training records using safe TypeORM entity mapping
        const allTraining = await this.trainingRepository.find({
            select: ['id', 'userId', 'courseId', 'courseName', 'subModule', 'status', 'enrollmentDate'],
        });

        // Fetch all completed certificates
        const allCerts = await this.certificatesRepository.find({
            where: { status: CertificateStatus.COMPLETED },
            select: ['id', 'userId', 'courseId', 'courseName', 'subModule', 'status', 'issuedAt'],
        });

        // Map userId -> Map of (dedupKey -> isCompleted)
        const userCourseMap = new Map<string, Map<string, boolean>>();

        for (const tr of allTraining) {
            const rawCourseName = (tr.courseName || '').trim();
            const rawSubModule = (tr.subModule || '').trim();

            if (rawCourseName.toLowerCase().startsWith('standard') || rawSubModule.toLowerCase().startsWith('standard')) {
                continue;
            }

            const isCompleted = tr.status === TrainingStatus.COMPLETED;

            // If not completed, it MUST have a valid enrollment date <= endOfToday
            if (!isCompleted) {
                if (!tr.enrollmentDate) continue;
                const enrolDate = new Date(tr.enrollmentDate);
                if (isNaN(enrolDate.getTime()) || enrolDate.getTime() > endOfToday.getTime()) {
                    continue;
                }
            }

            const normCourseName = this.normalizeCourseName(rawCourseName);
            const normSubModule = rawSubModule.toLowerCase();
            const dedupKey = `${normCourseName}::${normSubModule}`;

            if (!userCourseMap.has(tr.userId)) {
                userCourseMap.set(tr.userId, new Map());
            }
            const courses = userCourseMap.get(tr.userId)!;
            const existingCompleted = courses.get(dedupKey) || false;
            courses.set(dedupKey, existingCompleted || isCompleted);
        }

        // Merge completed standalone certificates
        for (const cert of allCerts) {
            if (!cert.issuedAt) continue;
            const rawCourseName = (cert.courseName || '').trim();
            const rawSubModule = (cert.subModule || '').trim();

            if (rawCourseName.toLowerCase().startsWith('standard') || rawSubModule.toLowerCase().startsWith('standard')) {
                continue;
            }

            const normCourseName = this.normalizeCourseName(rawCourseName);
            const normSubModule = rawSubModule.toLowerCase();
            const dedupKey = `${normCourseName}::${normSubModule}`;

            if (!userCourseMap.has(cert.userId)) {
                userCourseMap.set(cert.userId, new Map());
            }
            const courses = userCourseMap.get(cert.userId)!;
            courses.set(dedupKey, true); // completed
        }

        const parseIlccsNum = (num?: string | null): number => {
            if (!num) return -1;
            const digits = String(num).replace(/\D/g, '');
            const parsed = parseInt(digits, 10);
            return isNaN(parsed) ? -1 : parsed;
        };

        const sortedProfiles = validProfiles.sort((a, b) => {
            const numA = parseIlccsNum(a.ilccsNumber);
            const numB = parseIlccsNum(b.ilccsNumber);
            if (numA !== numB) return numB - numA; // Descending: bigger ILCCS first (e.g. ILCCS01284, ILCCS01283...)
            return (a.firstName || '').localeCompare(b.firstName || '');
        });

        return sortedProfiles.map((profile) => {
            const courses = userCourseMap.get(profile.user.id);
            let total = 0;
            let completed = 0;

            if (courses) {
                total = courses.size;
                for (const isComp of courses.values()) {
                    if (isComp) completed++;
                }
            }

            const firstName = profile.firstName || '';
            const lastName = profile.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || profile.user.email;

            return {
                id: profile.user.id,
                email: profile.user.email,
                firstName,
                lastName,
                fullName,
                ilccsNumber: profile.ilccsNumber || '',
                lcaNumber: profile.lcaNumber || '',
                profilePicture: profile.profilePicture || null,
                employmentStatus: profile.employmentStatus || 'Active',
                totalCertificates: total,
                completedCertificates: completed,
                pendingCertificates: Math.max(0, total - completed),
            };
        });
    }

    /**
     * Read-only: Get ALL courses a user is enrolled in (both Completed and Not Completed).
     * Excludes:
     *   1. Courses whose title starts with "Standard" (e.g. Care Certificate standards)
     *   2. Courses where enrollment date is missing / cleared (unless already completed)
     *   3. Courses where enrollment date is in the future (unless already completed)
     * Deduplicates courses so variations of names (e.g. "Certificate in X" vs "X") never produce duplicate cards.
     * NEVER writes to any database table.
     */
    async getCertificatesForStaff(userId: string) {
        const staffUser = await this.usersRepository.findOne({
            where: { id: userId },
        });
        if (!staffUser) {
            throw new NotFoundException('Staff member not found');
        }

        const profile = await this.staffProfileRepository.findOne({
            where: { user: { id: userId } },
        });

        // 1. Fetch all training records (all enrolled courses)
        const trainingRecords = await this.trainingRepository.find({
            where: { userId },
            relations: ['course'],
            order: { createdAt: 'ASC' },
        });

        // 2. Fetch all certificate rows
        const certificates = await this.certificatesRepository.find({
            where: { userId },
            order: { monthNumber: 'ASC', createdAt: 'ASC' },
        });

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const matchedCertIds = new Set<string>();
        const courseMap = new Map<string, any>();

        // Build list starting from all enrolled courses in training_records
        for (const tr of trainingRecords) {
            const rawCourseName = (tr.courseName || '').trim();
            const rawSubModule = (tr.subModule || '').trim();

            // RULE 1: Exclude certificates which start with "Standard"
            if (rawCourseName.toLowerCase().startsWith('standard') || rawSubModule.toLowerCase().startsWith('standard')) {
                continue;
            }

            const normCourseName = this.normalizeCourseName(rawCourseName);
            const normSubModule = rawSubModule.toLowerCase();

            // Find corresponding certificate row if present (matching courseId or normalized name)
            const cert = certificates.find((c) => {
                if (matchedCertIds.has(c.id)) return false;
                const subC = (c.subModule || '').trim().toLowerCase();
                if (normSubModule !== subC) return false;

                // 1. Same courseId if both have it
                if (tr.courseId && c.courseId && tr.courseId === c.courseId) return true;

                // 2. Normalized course names match
                const normC = this.normalizeCourseName(c.courseName || '');
                return normCourseName && normC && normCourseName === normC;
            });

            if (cert) {
                matchedCertIds.add(cert.id);
            }

            const isCompleted =
                tr.status === TrainingStatus.COMPLETED ||
                cert?.status === CertificateStatus.COMPLETED;

            // RULE 2: If course is NOT completed, it MUST have a valid enrollment date that has arrived
            if (!isCompleted) {
                if (!tr.enrollmentDate) {
                    continue; // No enrollment date: do NOT show
                }
                const enrolDate = new Date(tr.enrollmentDate);
                if (isNaN(enrolDate.getTime()) || enrolDate.getTime() > endOfToday.getTime()) {
                    continue; // Future or invalid enrollment date: do NOT show
                }
            }

            let displayDate: Date;
            let isEstimatedDate = false;
            let offsetDays = 0;

            if (isCompleted) {
                displayDate = tr.completedAt
                    ? new Date(tr.completedAt)
                    : (cert?.issuedAt ? new Date(cert.issuedAt) : new Date(tr.updatedAt || Date.now()));
                isEstimatedDate = false;
            } else {
                // Calculate temporary completion date (15-20 days ahead of enrollment date)
                const seed = this.hashString(tr.id || cert?.id || 'enrolled');
                offsetDays = 15 + (Math.abs(seed) % 6); // 15 to 20 days

                const baseDate = new Date(tr.enrollmentDate!);
                displayDate = new Date(baseDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
                isEstimatedDate = true;
            }

            const monthNumber = tr.course?.month ?? cert?.monthNumber ?? 1;
            const provider = tr.course?.provider ?? cert?.provider ?? 'Internal';
            const courseName = tr.courseName || cert?.courseName || 'Certificate Course';
            const subModule = tr.subModule || cert?.subModule || null;

            const dedupKey = `${normCourseName}::${normSubModule}`;
            const candidate = {
                id: cert?.id || tr.id, // ID used for view/download
                recordId: tr.id,
                certId: cert?.id || null,
                courseName,
                subModule,
                displayName: subModule || courseName,
                provider,
                monthNumber,
                status: isCompleted ? 'Completed' : 'Not Completed',
                isCompleted,
                displayDate: displayDate.toISOString(),
                isEstimatedDate,
                offsetDays: isEstimatedDate ? offsetDays : 0,
                enrollmentDate: tr.enrollmentDate ? new Date(tr.enrollmentDate).toISOString() : null,
                registrationNo: cert?.registrationNo || null,
            };

            const existing = courseMap.get(dedupKey);
            if (!existing) {
                courseMap.set(dedupKey, candidate);
            } else {
                // If existing is not completed but candidate is completed, upgrade to completed
                if (!existing.isCompleted && candidate.isCompleted) {
                    courseMap.set(dedupKey, candidate);
                } else {
                    // Merge fields without losing certId or registrationNo
                    if (!existing.certId && candidate.certId) {
                        existing.certId = candidate.certId;
                        existing.id = candidate.id;
                    }
                    if (!existing.registrationNo && candidate.registrationNo) {
                        existing.registrationNo = candidate.registrationNo;
                    }
                    if (!existing.enrollmentDate && candidate.enrollmentDate) {
                        existing.enrollmentDate = candidate.enrollmentDate;
                    }
                }
            }
        }

        // Add any standalone completed certificates that were not in training records
        for (const cert of certificates) {
            if (matchedCertIds.has(cert.id)) continue;

            const rawCourseName = (cert.courseName || '').trim();
            const rawSubModule = (cert.subModule || '').trim();

            // RULE 1: Exclude certificates which start with "Standard"
            if (rawCourseName.toLowerCase().startsWith('standard') || rawSubModule.toLowerCase().startsWith('standard')) {
                continue;
            }

            const isCompleted = cert.status === CertificateStatus.COMPLETED && !!cert.issuedAt;

            // RULE 2: Standalone uncompleted certificates have no enrollment date -> DO NOT SHOW
            if (!isCompleted) {
                continue;
            }

            const normCourseName = this.normalizeCourseName(rawCourseName);
            const normSubModule = rawSubModule.toLowerCase();
            const dedupKey = `${normCourseName}::${normSubModule}`;

            const displayDate = new Date(cert.issuedAt);
            const candidate = {
                id: cert.id,
                recordId: null,
                certId: cert.id,
                courseName: cert.courseName,
                subModule: cert.subModule || null,
                displayName: cert.subModule || cert.courseName,
                provider: cert.provider || 'Internal',
                monthNumber: cert.monthNumber ?? 1,
                status: 'Completed',
                isCompleted: true,
                displayDate: displayDate.toISOString(),
                isEstimatedDate: false,
                offsetDays: 0,
                enrollmentDate: null,
                registrationNo: cert.registrationNo || null,
            };

            const existing = courseMap.get(dedupKey);
            if (!existing) {
                courseMap.set(dedupKey, candidate);
            } else if (!existing.isCompleted) {
                courseMap.set(dedupKey, candidate);
            }
        }

        const enrolledCoursesList = Array.from(courseMap.values());

        // Sort by monthNumber ASC, then course name
        enrolledCoursesList.sort((a, b) => {
            if (a.monthNumber !== b.monthNumber) return a.monthNumber - b.monthNumber;
            return a.displayName.localeCompare(b.displayName);
        });

        // Group by month
        const months = [0, ...Array.from({ length: 12 }, (_, i) => i + 1)];
        const grouped = months.map((m) => ({
            month: m,
            certificates: enrolledCoursesList.filter((c) => c.monthNumber === m),
        }));

        return {
            staff: {
                id: staffUser.id,
                email: staffUser.email,
                firstName: profile?.firstName || '',
                lastName: profile?.lastName || '',
                fullName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || staffUser.email,
                ilccsNumber: profile?.ilccsNumber || '',
                lcaNumber: profile?.lcaNumber || '',
                profilePicture: profile?.profilePicture || null,
            },
            certificates: enrolledCoursesList,
            grouped,
        };
    }

    /**
     * Resolve target record (checks certificates or training_records)
     */
    async resolveRecordOwner(recordId: string): Promise<{ userId: string; courseName: string } | null> {
        const cert = await this.certificatesRepository.findOne({ where: { id: recordId } });
        if (cert) {
            return { userId: cert.userId, courseName: cert.subModule || cert.courseName };
        }
        const tr = await this.trainingRepository.findOne({ where: { id: recordId } });
        if (tr) {
            return { userId: tr.userId, courseName: tr.subModule || tr.courseName };
        }
        return null;
    }

    /**
     * Generate PDF on-the-fly directly into a memory Buffer with concurrency queue and singleton browser.
     * NEVER saves to database, NEVER mutates certificate or training records.
     */
    async generatePreviewPdf(recordId: string): Promise<{ buffer: Buffer; fileName: string }> {
        // Find record in either certificates or training_records
        const cert = await this.certificatesRepository.findOne({
            where: { id: recordId },
            relations: ['user'],
        });
        const tr = !cert
            ? await this.trainingRepository.findOne({
                where: { id: recordId },
                relations: ['user', 'course'],
            })
            : null;

        if (!cert && !tr) {
            throw new NotFoundException('Course record not found');
        }

        const targetUserId = cert?.userId || tr?.userId;
        const staffProfile = await this.staffProfileRepository.findOne({
            where: { user: { id: targetUserId } },
        });

        const firstName = staffProfile?.firstName || '';
        const lastName = staffProfile?.lastName || '';
        const rawFullName = `${firstName} ${lastName}`.trim() || 'Learner';
        const fullName = this.formatTitleCase(rawFullName);

        // Registration number
        const displayRegNo =
            staffProfile?.ilccsNumber ||
            staffProfile?.lcaNumber ||
            cert?.registrationNo ||
            `LCA-PREV-${recordId.slice(0, 8).toUpperCase()}`;

        const displayCourseName = tr?.subModule || cert?.subModule || tr?.courseName || cert?.courseName || 'Certificate Course';

        // RULE 1: Exclude certificates which start with "Standard"
        if (displayCourseName.trim().toLowerCase().startsWith('standard')) {
            throw new NotFoundException('Certificate is not available for this course');
        }

        const isCompleted =
            cert?.status === CertificateStatus.COMPLETED ||
            tr?.status === TrainingStatus.COMPLETED;

        let date: Date;
        if (isCompleted) {
            date = cert?.issuedAt
                ? new Date(cert.issuedAt)
                : (tr?.completedAt ? new Date(tr.completedAt) : new Date());
        } else {
            let enrollmentDate: Date | null = null;
            if (tr?.enrollmentDate) {
                enrollmentDate = new Date(tr.enrollmentDate);
            } else if (cert) {
                // If this is a cert row, try finding corresponding training record enrollment date
                const normName = this.normalizeCourseName(cert.courseName);
                const allTrs = await this.trainingRepository.find({
                    where: { userId: targetUserId },
                });
                const matchingTr = allTrs.find(
                    (r) => this.normalizeCourseName(r.courseName) === normName
                );
                if (matchingTr?.enrollmentDate) {
                    enrollmentDate = new Date(matchingTr.enrollmentDate);
                }
            }

            if (!enrollmentDate) {
                throw new NotFoundException('Course does not have an active enrollment date');
            }

            // RULE 2: Exclude if enrollment date has not arrived yet
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            if (enrollmentDate.getTime() > endOfToday.getTime()) {
                throw new NotFoundException('Certificate is not available until course enrollment date');
            }

            const seed = this.hashString(recordId);
            const offsetDays = 15 + (Math.abs(seed) % 6); // 15 to 20 days ahead
            date = new Date(enrollmentDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
        }

        // Load HTML template
        const templatePaths = [
            path.join(__dirname, '..', 'templates', 'certificate.html'),
            path.join(process.cwd(), 'src', 'templates', 'certificate.html'),
            path.join(process.cwd(), 'dist', 'templates', 'certificate.html'),
        ];
        let templatePath = templatePaths.find((p) => fs.existsSync(p));
        if (!templatePath) {
            throw new InternalServerErrorException('Certificate HTML template not found');
        }

        let htmlContent = fs.readFileSync(templatePath, 'utf8');

        // Inject background if present
        const base64Paths = [
            path.join(__dirname, '..', 'templates', 'bg-base64.txt'),
            path.join(process.cwd(), 'src', 'templates', 'bg-base64.txt'),
            path.join(process.cwd(), 'dist', 'templates', 'bg-base64.txt'),
        ];
        const base64Path = base64Paths.find((p) => fs.existsSync(p));
        if (base64Path) {
            const base64Data = fs.readFileSync(base64Path, 'utf8');
            htmlContent = htmlContent.replace('{{BACKGROUND_IMAGE}}', base64Data);
        }

        const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        htmlContent = htmlContent
            .replace(/{Learner_Name}/g, fullName)
            .replace(/{Course_Name}/g, displayCourseName)
            .replace(/{Reg_no}/g, displayRegNo)
            .replace(/{Date}/g, dateStr);

        await this.acquireRenderSlot();
        let page: any = null;
        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();
            page.setDefaultNavigationTimeout(30000);
            page.setDefaultTimeout(30000);
            await page.setViewport({ width: 1123, height: 794 });

            await page.setContent(htmlContent, { waitUntil: 'load' });

            try {
                await page.evaluateHandle('document.fonts.ready');
            } catch {
                // proceed if font wait expires
            }

            // GUARANTEE: Never exceed 2 lines for Course Name
            await page.evaluate(() => {
                const el = document.getElementById('course-name');
                if (!el) return;

                const getLines = (target: any) => {
                    const range = document.createRange();
                    range.selectNodeContents(target);
                    const rectCount = range.getClientRects().length;

                    const cs = window.getComputedStyle(target);
                    const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.2);
                    const heightCount = Math.round(target.scrollHeight / lh);

                    return Math.max(rectCount, heightCount);
                };

                let pt = parseFloat(el.style.fontSize) || 27;
                while (getLines(el) > 2 && pt > 10) {
                    pt -= 0.5;
                    el.style.fontSize = `${pt}pt`;
                }
            });

            const pdfBuffer = await page.pdf({
                printBackground: true,
                preferCSSPageSize: true,
                width: '1123px',
                height: '794px',
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
            });

            const safeCourseName = displayCourseName.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const fileName = `${safeCourseName}_Certificate.pdf`;

            return { buffer: Buffer.from(pdfBuffer), fileName };
        } finally {
            if (page) {
                await page.close().catch(() => {});
            }
            this.releaseRenderSlot();
        }
    }

    /**
     * IDOR Protected: Only signs a token if the user is Admin or the owner of the course record.
     */
    async generateViewToken(recordId: string, user: any): Promise<string> {
        const record = await this.resolveRecordOwner(recordId);
        if (!record) throw new NotFoundException('Course record not found');

        const requestingUserId = user.userId || user.id;
        if (user.role !== UserRole.ADMIN && record.userId !== requestingUserId) {
            throw new ForbiddenException('Access denied to this certificate');
        }

        return this.jwtService.sign(
            {
                certId: recordId,
                userId: requestingUserId,
                role: user.role,
                userName: user.userName || user.name,
                isIsolatedPreview: true,
            },
            { expiresIn: '15m' },
        );
    }

    async verifyViewToken(token?: string): Promise<any> {
        if (!token) return null;
        try {
            return this.jwtService.verify(token);
        } catch {
            return null;
        }
    }

    private formatTitleCase(str: string): string {
        if (!str) return '';
        return str
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .map((word) =>
                word
                    .split('-')
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join('-'),
            )
            .join(' ');
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
        }
        return hash;
    }
}
