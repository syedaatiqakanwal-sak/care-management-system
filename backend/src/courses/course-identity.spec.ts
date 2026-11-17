import {
    HISTORICAL_COURSE_TITLE_ALIASES,
    submoduleKey,
} from './course-identity.service';

describe('CourseIdentity — historical aliases (migration-only)', () => {
    it('maps Prevent short title to Certificate-in catalog title', () => {
        expect(HISTORICAL_COURSE_TITLE_ALIASES['Prevent Training and Competencies']).toBe(
            'Certificate in Prevent Training and Competencies',
        );
    });

    it('maps Equality Diversity rename variants', () => {
        expect(
            HISTORICAL_COURSE_TITLE_ALIASES[
                'Certificate in Equality Diversity and Inclusion in Care Setting'
            ],
        ).toBe('Certificate in Equality Diversity and Human Rights');
    });
});

describe('submoduleKey', () => {
    it('normalizes null/undefined to empty string for grouping', () => {
        expect(submoduleKey(null)).toBe('');
        expect(submoduleKey(undefined)).toBe('');
        expect(submoduleKey('Duty of Care')).toBe('Duty of Care');
    });
});

describe('logical course dedupe key', () => {
    function logicalKey(row: { courseId?: string | null; courseName: string; subModule?: string | null }) {
        return row.courseId
            ? `id:${row.courseId}::${submoduleKey(row.subModule)}`
            : `name:${row.courseName}::${submoduleKey(row.subModule)}`;
    }

    it('collapses renamed title variants when courseId is shared', () => {
        const a = {
            courseId: '3614ed37-da34-499c-a58e-c6f7f5c2608f',
            courseName: 'Certificate in Prevent Training and Competencies',
            subModule: null,
        };
        const b = {
            courseId: '3614ed37-da34-499c-a58e-c6f7f5c2608f',
            courseName: 'Prevent Training and Competencies',
            subModule: null,
        };
        expect(logicalKey(a)).toBe(logicalKey(b));
    });

    it('keeps different courses distinct', () => {
        const a = { courseId: 'aaa', courseName: 'A', subModule: null };
        const b = { courseId: 'bbb', courseName: 'B', subModule: null };
        expect(logicalKey(a)).not.toBe(logicalKey(b));
    });
});

describe('completion reversion rules', () => {
    type Row = { id: string; status: string; completedAt: Date | null; courseId: string };

    function revertAllForCourse(rows: Row[], courseId: string): Row[] {
        return rows.map((r) =>
            r.courseId === courseId
                ? { ...r, status: 'PENDING', completedAt: null }
                : r,
        );
    }

    it('clears every sibling training row for the logical course', () => {
        const courseId = '3614ed37-da34-499c-a58e-c6f7f5c2608f';
        const before: Row[] = [
            { id: '1', status: 'COMPLETED', completedAt: new Date('2026-06-12'), courseId },
            { id: '2', status: 'COMPLETED', completedAt: new Date('2026-06-12'), courseId },
            { id: '3', status: 'COMPLETED', completedAt: new Date('2026-01-01'), courseId: 'other' },
        ];
        const after = revertAllForCourse(before, courseId);
        expect(after.filter((r) => r.courseId === courseId).every((r) => r.status === 'PENDING')).toBe(true);
        expect(after.filter((r) => r.courseId === courseId).every((r) => r.completedAt === null)).toBe(true);
        expect(after.find((r) => r.id === '3')?.status).toBe('COMPLETED');
    });
});

describe('report inclusion rules', () => {
    type Training = {
        courseId: string | null;
        courseName: string;
        status: string;
        completedAt: Date | null;
        subModule?: string | null;
    };
    type Cert = { courseId: string | null; status: string };

    function includeInReport(
        tr: Training,
        certs: Cert[],
        start: Date,
        endExclusive: Date,
    ): boolean {
        if (tr.status !== 'COMPLETED' || !tr.completedAt) return false;
        if (tr.completedAt < start || tr.completedAt >= endExclusive) return false;
        const pending = certs.some(
            (c) =>
                c.status === 'Pending' &&
                tr.courseId &&
                c.courseId === tr.courseId,
        );
        return !pending;
    }

    it('excludes reverted certificate courses even if a sibling was COMPLETED', () => {
        const courseId = '3614ed37-da34-499c-a58e-c6f7f5c2608f';
        const tr: Training = {
            courseId,
            courseName: 'Prevent Training and Competencies',
            status: 'COMPLETED',
            completedAt: new Date('2026-06-12'),
        };
        const certs: Cert[] = [{ courseId, status: 'Pending' }];
        expect(
            includeInReport(tr, certs, new Date('2026-06-01'), new Date('2026-07-01')),
        ).toBe(false);
    });

    it('includes truly completed courses with Completed cert', () => {
        const courseId = '3614ed37-da34-499c-a58e-c6f7f5c2608f';
        const tr: Training = {
            courseId,
            courseName: 'Certificate in Prevent Training and Competencies',
            status: 'COMPLETED',
            completedAt: new Date('2026-06-12'),
        };
        const certs: Cert[] = [{ courseId, status: 'Completed' }];
        expect(
            includeInReport(tr, certs, new Date('2026-06-01'), new Date('2026-07-01')),
        ).toBe(true);
    });
});
