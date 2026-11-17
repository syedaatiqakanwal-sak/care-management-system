-- Permanent course identity: link training_records and certificates to courses.id
-- Idempotent: safe to re-run.

-- 1) Columns
ALTER TABLE training_records
  ADD COLUMN IF NOT EXISTS "courseId" uuid NULL;

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS "courseId" uuid NULL;

-- 2) Foreign keys (ignore if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_training_records_courseId'
  ) THEN
    ALTER TABLE training_records
      ADD CONSTRAINT "FK_training_records_courseId"
      FOREIGN KEY ("courseId") REFERENCES courses(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_certificates_courseId'
  ) THEN
    ALTER TABLE certificates
      ADD CONSTRAINT "FK_certificates_courseId"
      FOREIGN KEY ("courseId") REFERENCES courses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Indexes for lookup
CREATE INDEX IF NOT EXISTS "IDX_training_records_courseId"
  ON training_records ("courseId");

CREATE INDEX IF NOT EXISTS "IDX_certificates_courseId"
  ON certificates ("courseId");

CREATE INDEX IF NOT EXISTS "IDX_training_records_user_course"
  ON training_records ("userId", "courseId");

CREATE INDEX IF NOT EXISTS "IDX_certificates_user_course"
  ON certificates ("userId", "courseId");

-- 4) Backfill exact title matches (idempotent)
UPDATE training_records tr
SET "courseId" = c.id
FROM courses c
WHERE tr."courseId" IS NULL
  AND tr."courseName" = c.title;

UPDATE certificates cert
SET "courseId" = c.id
FROM courses c
WHERE cert."courseId" IS NULL
  AND cert."courseName" = c.title;

-- 5) Migration-only historical title aliases (known renames)
-- Prevent Training and Competencies → Certificate in Prevent Training and Competencies
UPDATE training_records
SET "courseId" = '3614ed37-da34-499c-a58e-c6f7f5c2608f'
WHERE "courseId" IS NULL
  AND "courseName" = 'Prevent Training and Competencies';

UPDATE certificates
SET "courseId" = '3614ed37-da34-499c-a58e-c6f7f5c2608f'
WHERE "courseId" IS NULL
  AND "courseName" = 'Prevent Training and Competencies';

-- Equality Diversity rename variants
UPDATE training_records
SET "courseId" = 'f4e3932b-0344-481f-9274-02a71cd7fb7f'
WHERE "courseId" IS NULL
  AND "courseName" IN (
    'Certificate in Equality Diversity and Inclusion in Care Setting',
    'Certificate in Equality Diversity and Inclusion in Care Settings'
  );

UPDATE certificates
SET "courseId" = 'f4e3932b-0344-481f-9274-02a71cd7fb7f'
WHERE "courseId" IS NULL
  AND "courseName" IN (
    'Certificate in Equality Diversity and Inclusion in Care Setting',
    'Certificate in Equality Diversity and Inclusion in Care Settings'
  );

-- Oliver McGowan Tier 1 certificate-prefixed variant
UPDATE training_records
SET "courseId" = '8f381520-dd6d-42fb-ba78-cb5b4165e73d'
WHERE "courseId" IS NULL
  AND "courseName" = 'Certificate in Tier 1 of the Oliver McGowan Mandatory Training on Learning Disability and Autism';

UPDATE certificates
SET "courseId" = '8f381520-dd6d-42fb-ba78-cb5b4165e73d'
WHERE "courseId" IS NULL
  AND "courseName" = 'Certificate in Tier 1 of the Oliver McGowan Mandatory Training on Learning Disability and Autism';

-- 6) Prefix/suffix normalization: "Certificate in X" ↔ "X" when exactly one course matches
UPDATE training_records tr
SET "courseId" = c.id
FROM courses c
WHERE tr."courseId" IS NULL
  AND (
    c.title = ('Certificate in ' || tr."courseName")
    OR tr."courseName" = ('Certificate in ' || c.title)
  );

UPDATE certificates cert
SET "courseId" = c.id
FROM courses c
WHERE cert."courseId" IS NULL
  AND (
    c.title = ('Certificate in ' || cert."courseName")
    OR cert."courseName" = ('Certificate in ' || c.title)
  );

-- NOTE: Duplicate merge + unique index are applied by the repair script
-- (src/scripts/repair-course-identity.ts) after application logic is deployed.
-- Do not add the unique index here until duplicates are merged.
