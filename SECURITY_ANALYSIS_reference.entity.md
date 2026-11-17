# Security Vulnerability Analysis: reference.entity.ts

## Executive Summary
This analysis identifies **10 security vulnerabilities** in the `backend/src/references/reference.entity.ts` file, ranging from **Critical** to **Medium** severity.

---

## Critical Vulnerabilities

### 1. **XSS (Cross-Site Scripting) Vulnerability in PDF Generation** 🔴 CRITICAL
**Location**: `submissionData` fields used in HTML generation (references.service.ts)
**Issue**: User input from `submissionData` is directly interpolated into HTML strings without escaping:
```typescript
<div class="form-value">${submissionData.comments || ''}</div>
<div class="form-value">${submissionData.additionalComments}</div>
<img src="${submissionData.signature}" class="signature-img" />
```
**Impact**: Attackers can inject malicious JavaScript that executes when PDFs are generated or viewed.
**Recommendation**: 
- Escape all user input using HTML entity encoding
- Use a library like `he` (HTML entities) or `dompurify`
- Sanitize signature image URLs to prevent XSS via data URIs

### 2. **No Input Validation on Entity Fields** 🔴 CRITICAL
**Location**: All string fields (lines 24-42)
**Issue**: No validation decorators or constraints on:
- `email` - No email format validation
- `name`, `phone`, `relationship` - No length limits or format validation
- `message` - No sanitization for XSS
- `referenceType` - Only a comment, not an enum
**Impact**: 
- Invalid data can be stored
- DoS attacks via extremely long strings
- Injection attacks
**Recommendation**:
- Create DTOs with `class-validator` decorators
- Add `@IsEmail()` for email field
- Add `@MaxLength()` constraints
- Convert `referenceType` to enum
- Use `@IsEnum()` validation

### 3. **Unsafe JSON Storage with Arbitrary Keys** 🔴 CRITICAL
**Location**: Line 68-79
```typescript
submissionData: {
    [key: string]: any;  // ⚠️ Allows ANY property
}
```
**Issue**: The `[key: string]: any` allows arbitrary data injection.
**Impact**: 
- Prototype pollution attacks
- Storage of malicious payloads
- Data corruption
**Recommendation**:
- Remove `[key: string]: any`
- Define explicit interface with only allowed fields
- Validate JSON structure before storing

---

## High Severity Vulnerabilities

### 4. **No Length Constraints on Text Fields** 🟠 HIGH
**Location**: Lines 26-42
**Issue**: String fields have no `@Column({ length: N })` constraints:
- `name`, `email`, `phone`, `relationship`, `yearsKnown` - No max length
- `message` (type: 'text') - Unlimited size
**Impact**: 
- Database DoS via extremely large payloads
- Memory exhaustion
- Performance degradation
**Recommendation**:
```typescript
@Column({ length: 255 })
name: string;

@Column({ length: 320 })  // Max email length
email: string;

@Column({ type: 'text', length: 10000 })  // Reasonable limit
message: string;
```

### 5. **Missing Email Format Validation** 🟠 HIGH
**Location**: Line 30
**Issue**: `email` field accepts any string, not validated as email format.
**Impact**: 
- Invalid email addresses stored
- Email sending failures
- Potential email injection attacks
**Recommendation**:
- Add `@IsEmail()` decorator in DTO
- Add database-level CHECK constraint (PostgreSQL)
- Validate before sending emails

### 6. **Unvalidated Reference Type** 🟠 HIGH
**Location**: Line 24
**Issue**: `referenceType` is a string with only a comment, not an enum.
**Impact**: 
- Invalid values can be stored
- Logic errors in type checking
**Recommendation**:
```typescript
export enum ReferenceType {
    PERSONAL = 'personal',
    PROFESSIONAL = 'professional',
}

@Column({
    type: 'enum',
    enum: ReferenceType,
})
referenceType: ReferenceType;
```

---

## Medium Severity Vulnerabilities

### 7. **No Input Sanitization on Text Fields** 🟡 MEDIUM
**Location**: Lines 41-42, 69-78
**Issue**: Text fields like `message`, `comments`, `additionalComments` are stored without sanitization.
**Impact**: 
- Stored XSS if data is later rendered in web UI
- Data corruption
**Recommendation**:
- Sanitize HTML/script tags before storage
- Use libraries like `dompurify` or `sanitize-html`
- Implement content security policies

### 8. **Token Security Concerns** 🟡 MEDIUM
**Location**: Line 45-46
**Issue**: 
- Token is unique but no validation on format/strength
- No expiration mechanism visible
- No rate limiting on token usage
**Impact**: 
- Weak tokens could be brute-forced
- No token rotation mechanism
**Recommendation**:
- Ensure tokens are cryptographically secure (use crypto.randomBytes)
- Add token expiration timestamps
- Implement rate limiting on token-based endpoints

### 9. **IP Address Storage Without Privacy Considerations** 🟡 MEDIUM
**Location**: Line 65
**Issue**: IP addresses stored without:
- User consent notice
- GDPR compliance considerations
- Data retention policy
**Impact**: 
- Privacy violations
- GDPR compliance issues
**Recommendation**:
- Add privacy policy notice
- Implement data retention/deletion
- Consider hashing IP addresses
- Add consent mechanism

### 10. **No Type Safety on submissionData** 🟡 MEDIUM
**Location**: Line 69
**Issue**: TypeScript type is defined but not enforced at runtime.
**Impact**: 
- Runtime errors if structure doesn't match
- Difficult to catch bugs early
**Recommendation**:
- Use `class-validator` with nested validation
- Implement runtime type checking
- Use Zod or similar for JSON schema validation

---

## Additional Recommendations

### 1. **Create DTOs with Validation**
Create separate DTOs for creating/updating references:
```typescript
export class CreateReferenceDto {
    @IsUUID()
    staffId: string;

    @IsEnum(ReferenceType)
    referenceType: ReferenceType;

    @IsString()
    @MaxLength(255)
    name: string;

    @IsEmail()
    @MaxLength(320)
    email: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    // ... etc
}
```

### 2. **Implement HTML Escaping Function**
```typescript
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

### 3. **Add Database Constraints**
```sql
ALTER TABLE references 
    ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

ALTER TABLE references 
    ADD CONSTRAINT check_name_length 
    CHECK (LENGTH(name) <= 255);
```

### 4. **Implement Input Sanitization Middleware**
Create a global validation pipe and sanitization middleware to handle all requests.

---

## Priority Fix Order

1. **Immediate (Critical)**: Fix XSS in PDF generation (#1)
2. **Immediate (Critical)**: Add input validation DTOs (#2)
3. **High Priority**: Add length constraints (#4)
4. **High Priority**: Fix referenceType enum (#6)
5. **Medium Priority**: Implement sanitization (#7)
6. **Medium Priority**: Review token security (#8)

---

## Testing Recommendations

1. **Penetration Testing**: Test XSS payloads in all text fields
2. **Load Testing**: Test with extremely long strings
3. **Input Validation Testing**: Test with malformed emails, invalid types
4. **Security Scanning**: Use tools like OWASP ZAP or Burp Suite

---

**Report Generated**: $(date)
**File Analyzed**: `backend/src/references/reference.entity.ts`
**Total Vulnerabilities Found**: 10 (3 Critical, 3 High, 4 Medium)
