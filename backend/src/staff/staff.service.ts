import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfile } from './staff-profile.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

import { AddressHistory } from './address-history.entity';
import { ReviewForm } from './review-form.entity';
import { CreateReviewFormDto } from './dto/create-review-form.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { TrainingRecord, TrainingStatus } from '../training/training-record.entity';
import { TrainingService } from '../training/training.service';
import { Course } from '../courses/course.entity';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

/** Inclusive calendar-month/year bounds for completion-date filtering (local server date parts). */
function getCompletionDateRange(year: number, month?: number): { startDate: Date; endDateExclusive: Date } {
    if (month == null) {
        return {
            startDate: new Date(year, 0, 1, 0, 0, 0, 0),
            endDateExclusive: new Date(year + 1, 0, 1, 0, 0, 0, 0),
        };
    }
    return {
        startDate: new Date(year, month - 1, 1, 0, 0, 0, 0),
        endDateExclusive: new Date(year, month, 1, 0, 0, 0, 0),
    };
}

/** Escape HTML special characters to prevent XSS in generated PDF templates */
function escapeHtml(unsafe: string | null | undefined): string {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** ILC logo as data URI for PDF report headers (Puppeteer-friendly, no external URL). */
let cachedReportLogoDataUri: string | null = null;
function getReportLogoDataUri(): string {
    if (cachedReportLogoDataUri) return cachedReportLogoDataUri;
    const candidates = [
        path.join(__dirname, '..', 'assets', 'ilc-logo.png'),
        path.join(process.cwd(), 'assets', 'ilc-logo.png'),
        path.join(process.cwd(), 'src', 'assets', 'ilc-logo.png'),
    ];
    for (const logoPath of candidates) {
        if (fs.existsSync(logoPath)) {
            cachedReportLogoDataUri = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            return cachedReportLogoDataUri;
        }
    }
    cachedReportLogoDataUri = '';
    return cachedReportLogoDataUri;
}

@Injectable()
export class StaffService {
    constructor(
        @InjectRepository(StaffProfile)
        private staffRepository: Repository<StaffProfile>,
        @InjectRepository(AddressHistory)
        private addressRepository: Repository<AddressHistory>,
        @InjectRepository(ReviewForm)
        private reviewFormRepository: Repository<ReviewForm>,
        @InjectRepository(TrainingRecord)
        private trainingRepository: Repository<TrainingRecord>,
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        private readonly trainingService: TrainingService,
        private usersService: UsersService,
    ) { }

    async createProfile(user: User, firstName: string, lastName: string, phoneNumber?: string, ilccsNumber?: string, department?: string, lcaNumber?: string) {
        const profile = this.staffRepository.create({
            user,
            // userId was removed from entity, relying on relation
            firstName,
            lastName,
            phoneNumber,
            ilccsNumber,
            lcaNumber, // Explicitly separate
            department,
        });
        return this.staffRepository.save(profile);
    }

    /**
     * Admin-only: Completely delete a user (staff member) and dependent data.
     * Steps:
     * - Delete training_records by userId (no FK cascade configured)
     * - Delete certificates by userId (no FK cascade configured)
     * - Delete the user (cascades will remove staff_profile, addresses, review_forms, references, notifications)
     */
    async deleteUserCompletely(userId: string): Promise<void> {
        await this.staffRepository.manager.transaction(async (tx) => {
            // 1) Remove training records (no cascade on FK)
            await tx.getRepository(TrainingRecord).delete({ userId });

            // 2) Remove certificates (use direct SQL to avoid importing repository here)
            await tx.query('DELETE FROM certificates WHERE "userId" = $1', [userId]);

            // 3) Delete the user row (this triggers cascades on related entities that have ON DELETE CASCADE)
            const userRepo = tx.getRepository(User);
            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user) {
                throw new NotFoundException('User not found');
            }
            await userRepo.remove(user);
        });
    }

    // --- GET METHODS ---

    async getProfileByUserId(userId: string): Promise<StaffProfile & { inductionDate?: Date }> {
        const profile = await this.staffRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user']
        });
        if (!profile) throw new NotFoundException('Profile not found for this user');

        return {
            ...profile,
            inductionDate: profile.inductionDate || profile.user?.createdAt
        };
    }

    async getProfileByStaffId(staffId: string): Promise<StaffProfile & { inductionDate?: Date }> {
        const profile = await this.staffRepository.findOne({
            where: { id: staffId }, // Use PK
            relations: ['user']
        });
        if (!profile) throw new NotFoundException('Profile not found');

        return {
            ...profile,
            inductionDate: profile.inductionDate || profile.user?.createdAt
        };
    }

    // --- UPDATE METHODS ---

    async updateProfileByUserId(userId: string, data: Partial<StaffProfile> & { email?: string }): Promise<StaffProfile> {
        const profile = await this.staffRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user']
        });
        if (!profile) throw new NotFoundException('Profile not found');

        return this.performUpdate(profile, data);
    }

    async updateProfileByStaffId(staffId: string, data: Partial<StaffProfile> & { email?: string }): Promise<StaffProfile> {
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user']
        });
        if (!profile) throw new NotFoundException('Profile not found');

        return this.performUpdate(profile, data);
    }

    private async performUpdate(profile: StaffProfile, data: Partial<StaffProfile> & { email?: string }) {
        if (data.email) {
            // Check for duplicate email
            const existingUser = await this.usersService.findByEmail(data.email);
            // profile.user.id is guaranteed to exist due to relations=['user']
            if (existingUser && existingUser.id !== profile.user.id) {
                throw new ConflictException('Email already in use by another user');
            }
            // Update User email
            await this.usersService.update(profile.user.id, { email: data.email });
        }

        const { email, employmentStatus, ...profileFields } = data;
        Object.assign(profile, profileFields);
        if (employmentStatus !== undefined) {
            profile.employmentStatus = employmentStatus;
        }
        return this.staffRepository.save(profile);
    }

    async findAll(): Promise<StaffProfile[]> {
        return this.staffRepository.find({
            relations: ['user'],
            order: { firstName: 'ASC' }
        });
    }

    async getStats() {
        try {
            if (!this.staffRepository) {
                return { total: 0, active: 0, left: 0 };
            }

            const rows = await this.staffRepository.query(`
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (
                        WHERE COALESCE(NULLIF(TRIM(sp."employmentStatus"), ''), 'Active')
                            IN ('Active')
                    )::int AS active,
                    COUNT(*) FILTER (
                        WHERE COALESCE(NULLIF(TRIM(sp."employmentStatus"), ''), 'Active')
                            IN ('Left', 'Leaver')
                    )::int AS left
                FROM users u
                INNER JOIN staff_profiles sp ON u.id = sp."userId"
                WHERE u.role = 'STAFF'
            `);

            return {
                total: rows[0]?.total ?? 0,
                active: rows[0]?.active ?? 0,
                left: rows[0]?.left ?? 0,
            };
        } catch (error) {
            return { total: 0, active: 0, left: 0 };
        }
    }

    async getDashboardStats() {
        // Employment-status aggregates (not login/session activity)
        const countRows = await this.staffRepository.query(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (
                    WHERE COALESCE(NULLIF(TRIM(sp."employmentStatus"), ''), 'Active')
                        IN ('Active')
                )::int AS active,
                COUNT(*) FILTER (
                    WHERE COALESCE(NULLIF(TRIM(sp."employmentStatus"), ''), 'Active')
                        IN ('Left', 'Leaver')
                )::int AS left
            FROM users u
            INNER JOIN staff_profiles sp ON u.id = sp."userId"
            WHERE u.role = 'STAFF'
        `);

        const activeStaff = countRows[0]?.active ?? 0;
        const leftStaff = countRows[0]?.left ?? 0;
        // Total Staff = Active + Left (employment status only; excludes Paused/Suspended/etc.)
        const totalStaff = activeStaff + leftStaff;

        const rawData = await this.staffRepository.query(`
            SELECT 
                u.id as "userId",
                u.email,
                u.role,
                sp."firstName",
                sp."lastName",
                sp.department,
                sp."ilccsNumber",
                sp."profilePicture",
                sp."employmentStatus"
            FROM users u
            INNER JOIN staff_profiles sp ON u.id = sp."userId"
            WHERE u.role = 'STAFF'
            ORDER BY u."createdAt" DESC
        `);

        const users = rawData.map(row => {
            const employmentStatus = row.employmentStatus || 'Active';
            const employmentBadgeMap: Record<string, string> = {
                Active: 'ACTIVE',
                Left: 'LEFT',
                Paused: 'PAUSED',
                Suspended: 'SUSPENDED',
                'On Hold': 'PAUSED',
                Leaver: 'LEFT',
                Inactive: 'SUSPENDED',
            };
            const employmentBadge = employmentBadgeMap[employmentStatus] ?? String(employmentStatus).toUpperCase();
            // Directory filters/badges use employment status (same source as Active/Left cards)
            const status =
                employmentBadge === 'LEFT' ? 'LEFT'
                : employmentBadge === 'ACTIVE' ? 'ACTIVE'
                : employmentBadge;

            return {
                id: row.userId,
                fullName: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.firstName || 'Staff',
                email: row.email,
                role: row.department || row.role,
                status,
                employmentStatus,
                employmentBadge,
                ilccsNumber: row.ilccsNumber,
                profilePicture: row.profilePicture ? `/api/v1/staff/${row.userId}/profile-picture` : null
            };
        });

        return {
            totalStaff,
            activeStaff,
            leftStaff,
            // Backwards-compatible aliases for any older clients
            totalUsers: totalStaff,
            activeUsers: activeStaff,
            inactiveUsers: leftStaff,
            users
        };
    }

    async debugCounts() {
        const repoCount = await this.staffRepository.count();
        const rawCount = await this.staffRepository.query('SELECT COUNT(*) as count FROM staff_profiles');
        const tableName = this.staffRepository.metadata.tableName;

        console.log('--- LIVE DEBUG ---');
        console.log('Repo Table Name:', tableName);
        console.log('Repo Count:', repoCount);
        console.log('Raw Count:', rawCount);

        return {
            repoTableName: tableName,
            repoCount,
            rawCount: rawCount[0],
            message: 'Check console for details'
        };
    }

    // --- Address History Methods ---

    async getAddresses(staffId: string) {
        // staffId passed here is expected to be the staffProfile ID, but usually we deal with userId in controllers.
        // Let's resolve userId to staffProfile ID first, or just query by staffProfile relations.
        // Actually, our entity relations: AddressHistory -> StaffProfile.
        // If we have userId, we find the profile first.
        const profile = await this.staffRepository.findOne({ where: { user: { id: staffId } } });
        if (!profile) return []; // Or throw

        return this.addressRepository.find({
            where: { staffProfile: { id: profile.id } },
            order: { dateFrom: 'DESC' }
        });
    }

    async addAddress(userId: string, data: CreateAddressDto) {
        const profile = await this.staffRepository.findOne({ where: { user: { id: userId } } });
        if (!profile) throw new NotFoundException('Staff Profile not found');

        const line1 =
            data.line1 != null && String(data.line1).trim() !== '' ? String(data.line1).trim() : null;

        const address = this.addressRepository.create({
            ...data,
            line1,
            staffProfile: profile,
            staffId: profile.id
        });
        return this.addressRepository.save(address);
    }

    async removeAddress(userId: string, addressId: string) {
        // Ensure ownership
        const profile = await this.staffRepository.findOne({ where: { user: { id: userId } } });
        if (!profile) throw new NotFoundException('access denied');

        const address = await this.addressRepository.findOne({
            where: { id: addressId, staffProfile: { id: profile.id } }
        });

        if (!address) throw new NotFoundException('Address not found');
        return this.addressRepository.remove(address);
    }

    // --- Review Form Methods ---

    // Convert empty strings to null for date columns so PostgreSQL doesn't reject them
    private sanitizeDateFields(dto: any): void {
        const dateFields = ['startDate', 'dateOfReview', 'careStaffDate', 'reviewerDate'];
        for (const field of dateFields) {
            if (dto[field] !== undefined && (dto[field] === '' || dto[field] === null)) {
                dto[field] = null;
            }
        }
    }

    async createReviewForm(staffId: string, dto: CreateReviewFormDto): Promise<ReviewForm> {
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
        });
        if (!profile) throw new NotFoundException('Staff Profile not found');

        this.sanitizeDateFields(dto);

        const reviewForm = this.reviewFormRepository.create({
            ...dto,
            staff: profile,
        });
        return this.reviewFormRepository.save(reviewForm);
    }

    async getReviewFormsByStaffId(staffId: string): Promise<ReviewForm[]> {
        return this.reviewFormRepository.find({
            where: { staff: { id: staffId } },
            order: { dateOfReview: 'DESC', createdAt: 'DESC' },
        });
    }

    async getReviewFormById(id: string): Promise<ReviewForm> {
        const form = await this.reviewFormRepository.findOne({
            where: { id },
            relations: ['staff'],
        });
        if (!form) throw new NotFoundException('Review form not found');
        return form;
    }

    async updateReviewForm(id: string, dto: Partial<CreateReviewFormDto>, user?: any): Promise<ReviewForm> {
        const form = await this.reviewFormRepository.findOne({ 
            where: { id },
            relations: ['staff', 'staff.user']
        });
        if (!form) throw new NotFoundException('Review form not found');

        // If user is provided and is STAFF, check ownership and restrict updates
        if (user && user.role === 'STAFF') {
            // Verify the form belongs to the logged-in staff member
            if (form.staff.user.id !== user.userId) {
                throw new ForbiddenException('You can only update your own review forms.');
            }

            // For STAFF users, only allow updates to signature-related fields
            // For appraisal forms, signatures are stored in documentationComments as JSON
            if (form.formType === 'appraisal' && dto.documentationComments) {
                try {
                    // Parse the incoming data
                    const incomingData = JSON.parse(dto.documentationComments);
                    // Parse existing form data
                    let existingData: any = {};
                    if (form.documentationComments) {
                        try {
                            existingData = JSON.parse(form.documentationComments);
                        } catch (e) {
                            // If existing data is not JSON, create new structure
                            existingData = { type: 'firstYearAppraisal', data: {} };
                        }
                    }

                    // Merge only signature-related fields from incoming data
                    if (incomingData.data) {
                        const allowedSignatureFields = [
                            'appraiseeSignature',
                            'appraiserSignature',
                            'signatureDate'
                        ];
                        
                        // Initialize existingData.data if it doesn't exist
                        if (!existingData.data) {
                            existingData.data = {};
                        }
                        
                        // Preserve all existing data fields first
                        const mergedData = { ...existingData.data };
                        
                        // Update only signature fields from incoming data
                        allowedSignatureFields.forEach(field => {
                            if (incomingData.data[field] !== undefined) {
                                mergedData[field] = incomingData.data[field];
                            }
                        });

                        // Update existingData with merged data
                        existingData.data = mergedData;

                        // Preserve the type if it exists
                        if (incomingData.type) {
                            existingData.type = incomingData.type;
                        } else if (!existingData.type) {
                            existingData.type = 'firstYearAppraisal';
                        }

                        // Update dto to only contain the merged signature data
                        dto.documentationComments = JSON.stringify(existingData);
                    }
                } catch (e) {
                    // If parsing fails, allow the update (might be a different format)
                    console.error('Error parsing appraisal data for signature update:', e);
                }
            } else {
                // For non-appraisal forms, only allow care staff signature field updates
                const allowedFields: Partial<CreateReviewFormDto> = {};
                if (dto.careStaffSignature !== undefined) allowedFields.careStaffSignature = dto.careStaffSignature;
                if (dto.careStaffDate !== undefined) allowedFields.careStaffDate = dto.careStaffDate;
                if (dto.documentationComments !== undefined) {
                    // For supervision forms, allow documentationComments updates (signatures are stored there)
                    if (form.formType === 'supervision') {
                        allowedFields.documentationComments = dto.documentationComments;
                    }
                }
                // Replace dto with only allowed fields
                Object.keys(dto).forEach(key => {
                    if (!(key in allowedFields)) {
                        delete dto[key];
                    }
                });
                Object.assign(dto, allowedFields);
            }
        }

        // Sanitize empty date strings to null before saving
        this.sanitizeDateFields(dto);

        // Apply updates
        Object.assign(form, dto);
        return this.reviewFormRepository.save(form);
    }

    async deleteReviewForm(id: string): Promise<void> {
        const form = await this.reviewFormRepository.findOne({ where: { id } });
        if (!form) throw new NotFoundException('Review form not found');
        await this.reviewFormRepository.remove(form);
    }

    /**
     * Activity reports must match Credentials: only Completed certificates count.
     * Orphan / external training rows without a Completed certificate are excluded.
     * Date range uses training_records.completedAt (synced from certificate completion).
     */
    private async findCompletedTrainingsInRange(
        userId: string,
        startDate: Date,
        endDateExclusive: Date,
    ): Promise<TrainingRecord[]> {
        if (!userId) {
            throw new NotFoundException('Staff user id is required for activity reports');
        }

        // Keep training status in sync with completed certificates before reporting
        await this.trainingService.syncCertificatesToTraining(userId);

        const rows = await this.trainingRepository
            .createQueryBuilder('tr')
            .where('tr.userId = :userId', { userId })
            .andWhere('tr.status = :status', { status: TrainingStatus.COMPLETED })
            .andWhere('tr.completedAt IS NOT NULL')
            .andWhere('tr.completedAt >= :startDate', { startDate })
            .andWhere('tr.completedAt < :endDateExclusive', { endDateExclusive })
            // Credentials parity: require a matching Completed certificate (no orphan training)
            .andWhere(`EXISTS (
                SELECT 1 FROM certificates c
                WHERE c."userId" = tr."userId"
                  AND c.status = 'Completed'
                  AND (
                    (
                      tr."courseId" IS NOT NULL
                      AND c."courseId" = tr."courseId"
                      AND c."subModule" IS NOT DISTINCT FROM tr."subModule"
                    )
                    OR (
                      (c."courseName" = tr."courseName" AND c."subModule" IS NOT DISTINCT FROM tr."subModule")
                      OR (tr."subModule" IS NOT NULL AND c."courseName" = tr."subModule")
                      OR (c."subModule" IS NOT NULL AND c."subModule" = tr."courseName")
                    )
                  )
            )`)
            .orderBy('tr.completedAt', 'ASC')
            .addOrderBy('tr.courseName', 'ASC')
            .getMany();

        // Deduplicate by stable course identity (courseId), falling back to name only for orphans
        const seen = new Set<string>();
        return rows.filter((tr) => {
            const key = tr.courseId
                ? `id:${tr.courseId}::${tr.subModule ?? ''}`
                : `name:${tr.courseName}::${tr.subModule ?? ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async generateMonthlyReport(staffId: string, year: number, month: number): Promise<Buffer> {
        // Get staff profile
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user'],
        });
        if (!profile) {
            throw new NotFoundException('Staff profile not found');
        }
        if (!profile.user?.id) {
            throw new NotFoundException('Staff user account not found for this profile');
        }

        const staffName = escapeHtml(`${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim());
        const jobTitle = escapeHtml(profile.department || 'Care Staff');

        // Calendar month bounds — filter by completion date only (not enrollment/assignment)
        const { startDate, endDateExclusive } = getCompletionDateRange(year, month);

        const monthlyTrainings = await this.findCompletedTrainingsInRange(
            profile.user.id,
            startDate,
            endDateExclusive,
        );

        // Generate HTML for the report
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[month - 1];

        // Build training table rows
        let trainingRows = '';
        monthlyTrainings.forEach(tr => {
            const dateStr = tr.completedAt ? new Date(tr.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
            const courseName = escapeHtml(tr.subModule || tr.courseName);
            trainingRows += `<tr><td>${escapeHtml(dateStr)}</td><td>${courseName}</td></tr>`;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Monthly Activity Report - ${monthName} ${year}</title>
                <style>
                    @page {
                        margin: 15mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11pt;
                        color: #000;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 14pt;
                        margin-top: 5px;
                    }
                    .logo-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 20px;
                    }
                    .report-logo {
                        height: 90px;
                        width: auto;
                        max-width: 340px;
                        object-fit: contain;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #f5f5f5;
                        border-left: 4px solid #00659D;
                    }
                    .staff-info p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 14pt;
                        margin-top: 25px;
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #e8e8e8;
                        border-left: 4px solid #00659D;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #00659D;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .no-data {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-style: italic;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ccc;
                        text-align: center;
                        font-size: 9pt;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-container">
                        <img class="report-logo" src="${getReportLogoDataUri()}" alt="Inspire London College" />
                        <div class="subtitle">Monthly Activity Report</div>
                    </div>
                </div>

                <div class="staff-info">
                    <p><strong>Employee Name:</strong> ${staffName}</p>
                    <p><strong>Job Title:</strong> ${jobTitle}</p>
                    <p><strong>Report Period:</strong> ${monthName} ${year}</p>
                </div>

                <div class="section-title">Training Completed in ${monthName} ${year}</div>
                ${monthlyTrainings.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 25%;">Date Completed</th>
                                <th style="width: 75%;">Title - Training / Qualifications</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trainingRows}
                        </tbody>
                    </table>
                ` : `
                    <div class="no-data">No training completed in this month.</div>
                `}

                <div class="footer">
                    <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p>Lets Care All - CPD Platform</p>
                </div>
            </body>
            </html>
        `;

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm',
            },
        });
        await browser.close();

        return Buffer.from(pdfBuffer);
    }

    async generateYearlyReport(staffId: string, year: number): Promise<Buffer> {
        // Get staff profile
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user'],
        });
        if (!profile) {
            throw new NotFoundException('Staff profile not found');
        }
        if (!profile.user?.id) {
            throw new NotFoundException('Staff user account not found for this profile');
        }

        const staffName = escapeHtml(`${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim());
        const jobTitle = escapeHtml(profile.department || 'Care Staff');

        // Calendar year bounds — filter by completion date only (not enrollment/assignment)
        const { startDate, endDateExclusive } = getCompletionDateRange(year);

        const yearlyTrainings = await this.findCompletedTrainingsInRange(
            profile.user.id,
            startDate,
            endDateExclusive,
        );

        // Group trainings by month
        const trainingsByMonth: Record<number, typeof yearlyTrainings> = {};
        yearlyTrainings.forEach(tr => {
            if (tr.completedAt) {
                const month = new Date(tr.completedAt).getMonth();
                if (!trainingsByMonth[month]) {
                    trainingsByMonth[month] = [];
                }
                trainingsByMonth[month].push(tr);
            }
        });

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        // Build HTML with monthly breakdown
        let monthlySections = '';
        for (let month = 0; month < 12; month++) {
            const monthTrainings = trainingsByMonth[month] || [];
            
            if (monthTrainings.length === 0) {
                continue; // Skip months with no training
            }

            let trainingRows = '';
            monthTrainings.forEach(tr => {
                const dateStr = tr.completedAt ? new Date(tr.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                const courseName = escapeHtml(tr.subModule || tr.courseName);
                trainingRows += `<tr><td>${escapeHtml(dateStr)}</td><td>${courseName}</td></tr>`;
            });

            monthlySections += `
                <div class="month-section" style="page-break-inside: avoid; margin-bottom: 30px;">
                    <div class="section-title">${monthNames[month]} ${year}</div>
                    
                    <div style="margin-bottom: 20px;">
                        <strong>Training Completed:</strong>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 25%;">Date Completed</th>
                                    <th style="width: 75%;">Title - Training / Qualifications</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${trainingRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Yearly Activity Report - ${year}</title>
                <style>
                    @page {
                        margin: 15mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11pt;
                        color: #000;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 14pt;
                        margin-top: 5px;
                    }
                    .logo-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 20px;
                    }
                    .report-logo {
                        height: 90px;
                        width: auto;
                        max-width: 340px;
                        object-fit: contain;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #f5f5f5;
                        border-left: 4px solid #00659D;
                    }
                    .staff-info p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 16pt;
                        margin-top: 25px;
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #e8e8e8;
                        border-left: 4px solid #00659D;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #00659D;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .no-data {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-style: italic;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ccc;
                        text-align: center;
                        font-size: 9pt;
                        color: #666;
                    }
                    .summary {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #e8f4f8;
                        border-left: 4px solid #00659D;
                    }
                    .summary p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-container">
                        <img class="report-logo" src="${getReportLogoDataUri()}" alt="Inspire London College" />
                        <div class="subtitle">Yearly Activity Report</div>
                    </div>
                </div>

                <div class="staff-info">
                    <p><strong>Employee Name:</strong> ${staffName}</p>
                    <p><strong>Job Title:</strong> ${jobTitle}</p>
                    <p><strong>Report Period:</strong> ${year}</p>
                </div>

                <div class="summary">
                    <p><strong>Total Training Completed:</strong> ${yearlyTrainings.length}</p>
                </div>

                ${monthlySections || '<div class="no-data">No activity recorded for this year.</div>'}

                <div class="footer">
                    <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p>Lets Care All - CPD Platform</p>
                </div>
            </body>
            </html>
        `;

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm',
            },
        });
        await browser.close();

        return Buffer.from(pdfBuffer);
    }

    async generateEnrollmentCompletionReport(staffId: string): Promise<Buffer> {
        // Get staff profile
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user'],
        });
        if (!profile) {
            throw new NotFoundException('Staff profile not found');
        }

        const staffName = escapeHtml(`${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim());
        const jobTitle = escapeHtml(profile.department || 'Care Staff');
        const ilccsNumber = escapeHtml(profile.ilccsNumber || 'N/A');

        // Sync first to ensure data consistency (matching TrainingService.findAllForUser / training tab)
        await this.trainingService.syncCertificatesToTraining(profile.user.id);

        const allCourses = await this.courseRepository.find({
            select: ['id', 'title'],
        });
        const validCourseIds = new Set(allCourses.map((c) => c.id));
        const validCourseTitles = new Set(allCourses.map((c) => c.title));

        const allTrainingRecords = await this.trainingRepository.find({
            where: {
                userId: profile.user.id,
            },
            order: {
                courseName: 'ASC',
                enrollmentDate: 'ASC',
            },
        });

        const trainingRecords = allTrainingRecords.filter((tr) =>
            (tr.courseId != null && validCourseIds.has(tr.courseId)) ||
            validCourseTitles.has(tr.courseName),
        );

        // Build training table rows with enrollment and completion dates
        let trainingRows = '';
        trainingRecords.forEach(tr => {
            const courseName = escapeHtml(tr.subModule ? `${tr.courseName} - ${tr.subModule}` : tr.courseName);
            const enrollmentDate = escapeHtml(tr.enrollmentDate 
                ? new Date(tr.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'Not Enrolled');
            const completionDate = escapeHtml(tr.completedAt 
                ? new Date(tr.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'Not Completed');
            const status = tr.status === TrainingStatus.COMPLETED ? 'Completed' : 'Pending';
            
            trainingRows += `
                <tr>
                    <td>${courseName}</td>
                    <td>${enrollmentDate}</td>
                    <td>${completionDate}</td>
                    <td>${status}</td>
                </tr>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Enrollment and Completion Report</title>
                <style>
                    @page {
                        margin: 15mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11pt;
                        color: #000;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 14pt;
                        margin-top: 5px;
                    }
                    .logo-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 20px;
                    }
                    .report-logo {
                        height: 90px;
                        width: auto;
                        max-width: 340px;
                        object-fit: contain;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #f5f5f5;
                        border-left: 4px solid #00659D;
                    }
                    .staff-info p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 14pt;
                        margin-top: 25px;
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #e8e8e8;
                        border-left: 4px solid #00659D;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #00659D;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .no-data {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-style: italic;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ccc;
                        text-align: center;
                        font-size: 9pt;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-container">
                        <img class="report-logo" src="${getReportLogoDataUri()}" alt="Inspire London College" />
                        <div class="subtitle">Enrollment and Completion Report</div>
                    </div>
                </div>

                <div class="staff-info">
                    <p><strong>Employee Name:</strong> ${staffName}</p>
                    <p><strong>Job Title:</strong> ${jobTitle}</p>
                    <p><strong>ILCCS Number:</strong> ${ilccsNumber}</p>
                    <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>

                <div class="section-title">Training Plan - Enrollment and Completion Status</div>
                ${trainingRecords.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40%;">Course Name</th>
                                <th style="width: 20%;">Enrollment Date</th>
                                <th style="width: 20%;">Completion Date</th>
                                <th style="width: 20%;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trainingRows}
                        </tbody>
                    </table>
                ` : `
                    <div class="no-data">No training records found.</div>
                `}

                <div class="footer">
                    <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p>Lets Care All - CPD Platform</p>
                </div>
            </body>
            </html>
        `;

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm',
            },
        });
        await browser.close();

        return Buffer.from(pdfBuffer);
    }
}
