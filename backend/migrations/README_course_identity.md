# Course Identity Migration (2026-08-05)

## Apply

```bash
# 1) Schema + initial backfill
docker exec -i cpd-backend-db psql -U postgres -d postgres \
  < migrations/add_course_id_to_training_and_certificates_20260805.sql

# 2) Merge duplicates + unique index (idempotent)
cd backend
npm run repair:course-identity
# or: npx ts-node src/scripts/repair-course-identity.ts --dry-run
```

## What changed

- `training_records.courseId` and `certificates.courseId` FK → `courses.id`
- Unique index `UQ_training_user_course_submodule` on `(userId, courseId, COALESCE(subModule,''))`
- Runtime identity uses `courseId`; historical title aliases only in migration/repair
- Course rename propagates denormalized `courseName` without creating a new identity
