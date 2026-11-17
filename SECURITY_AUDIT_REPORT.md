# Security Audit Report - CPD Platform
**Date:** 2026-03-06  
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 CRITICAL VULNERABILITIES

### 1. **SQL Injection via Raw Queries** 🔴 CRITICAL
**Location:** `backend/src/staff/staff.service.ts` (lines 157-180), `backend/src/scripts/manage-users.ts` (line 17)

**Issue:**
```typescript
// VULNERABLE CODE:
const rawData = await this.staffRepository.query(`
    SELECT u.id as "userId", u.email, u.role
    FROM users u
    WHERE u.role = 'STAFF'
`);
// In manage-users.ts:
await dataSource.query(`DELETE FROM users WHERE email = '${email}'`);
```

**Risk:** Direct SQL injection if user input reaches these queries. While currently using hardcoded values, any future modification could introduce injection.

**Recommendation:**
- Use parameterized queries: `query('SELECT * FROM users WHERE email = $1', [email])`
- Prefer TypeORM QueryBuilder or Repository methods
- Never concatenate user input into SQL strings

---

### 2. **TypeORM Synchronize Enabled in Production** 🔴 CRITICAL
**Location:** `backend/src/app.module.ts` (line 34)

**Issue:**
```typescript
synchronize: true, // Forced true for dev debugging
```

**Risk:** 
- Automatic schema changes can cause data loss
- No migration history/rollback capability
- Production schema can be modified accidentally

**Recommendation:**
- Set `synchronize: false` in production
- Use proper migrations: `npm run typeorm migration:generate`
- Implement migration strategy

---

### 3. **CORS Enabled for All Origins** 🔴 CRITICAL
**Location:** `backend/src/main.ts` (line 18)

**Issue:**
```typescript
app.enableCors(); // Allows ALL origins
```

**Risk:** 
- Any website can make requests to your API
- CSRF attacks possible
- Data leakage to unauthorized domains

**Recommendation:**
```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://72.62.199.119:81'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

### 4. **Missing Rate Limiting** 🔴 CRITICAL
**Location:** All endpoints, especially authentication endpoints

**Issue:** No rate limiting on:
- Login endpoints (`/api/v1/auth/login`)
- Password reset (`/api/v1/auth/forgot-password`)
- Reference submission (`/api/v1/reference/submit/:token`)
- API token creation

**Risk:**
- Brute force attacks on passwords
- DDoS attacks
- Email spam via password reset
- Token enumeration

**Recommendation:**
- Install `@nestjs/throttler`
- Implement rate limiting: 5 attempts per 15 minutes for login
- 10 requests per minute for general endpoints
- 3 password reset attempts per hour

---

### 5. **Insecure Direct Object References (IDOR)** 🟠 HIGH
**Location:** Multiple endpoints

**Issue:**
```typescript
// staff.controller.ts - Line 384-406
@Get()
async findAll(@Param('staffId') staffId: string, @Req() req) {
    // Comment says: "For now, let's allow read if they are staff"
    // No actual verification that staffId belongs to req.user
}
```

**Risk:** Staff members can access other staff members' data by changing the `staffId` parameter.

**Recommendation:**
```typescript
if (user.role !== UserRole.ADMIN) {
    const profile = await this.staffService.getProfileByUserId(user.userId);
    if (profile.id !== staffId) {
        throw new ForbiddenException('Access denied');
    }
}
```

---

## 🟠 HIGH SEVERITY VULNERABILITIES

### 6. **File Upload Vulnerabilities** 🟠 HIGH
**Location:** `backend/src/policies/policies-crud.controller.ts`, `backend/src/staff/staff.controller.ts`

**Issues:**
1. **No file type validation beyond MIME type** (MIME types can be spoofed)
2. **Filename injection** - Original filename used in storage path
3. **No virus scanning**
4. **Unlimited file size** (only 15MB limit for policies, no limit for profile pictures)
5. **Path traversal possible** if filename contains `../`

**Risk:**
- Malicious file uploads
- Server-side code execution
- Storage exhaustion
- Path traversal attacks

**Recommendation:**
```typescript
// Validate file extension
const allowedExtensions = ['.pdf'];
const ext = path.extname(file.originalname).toLowerCase();
if (!allowedExtensions.includes(ext)) {
    throw new BadRequestException('Invalid file type');
}

// Sanitize filename
const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
const filename = `${Date.now()}_${sanitized}`;

// Scan for viruses (use ClamAV or similar)
// Limit file sizes strictly
```

---

### 7. **JWT Token Security Issues** 🟠 HIGH
**Location:** `backend/src/auth/auth.service.ts`, `backend/src/policies/policies-crud.controller.ts`

**Issues:**
1. **No token blacklisting** - Tokens valid until expiration even after logout
2. **Short expiration for view tokens** (60 seconds) but no refresh mechanism
3. **JWT secret might be weak** - Check if using strong random secret
4. **No token rotation**

**Risk:**
- Stolen tokens remain valid
- Session hijacking
- Token reuse attacks

**Recommendation:**
- Implement token blacklist (Redis)
- Add refresh tokens
- Rotate JWT secrets periodically
- Use strong secrets (32+ characters, random)

---

### 8. **Missing Input Validation on Public Endpoints** 🟠 HIGH
**Location:** `backend/src/references/references.controller.ts` (lines 341-367)

**Issue:**
```typescript
@Post('submit/:token')
async submitReference(
    @Param('token') token: string,
    @Body() submissionData: any, // No DTO validation!
    @Ip() ipAddress: string,
) {
```

**Risk:**
- No validation on `submissionData`
- Potential XSS if data is rendered
- Data injection attacks
- Large payload DoS

**Recommendation:**
- Create `SubmitReferenceDto` with class-validator decorators
- Validate all fields, lengths, types
- Sanitize HTML content
- Limit payload size

---

### 9. **Sensitive Data in Logs** 🟠 HIGH
**Location:** Multiple files

**Issue:**
```typescript
// staff.service.ts - Line 177-180
const allUsers = await this.staffRepository.query('SELECT id, email, role FROM users');
console.log('DASHBOARD DEBUG: All users in DB:', allUsers);
```

**Risk:**
- User emails, IDs exposed in logs
- Logs might be accessible to unauthorized users
- Compliance violations (GDPR)

**Recommendation:**
- Remove debug logs in production
- Use log levels (debug, info, error)
- Sanitize logs: `console.log('User count:', users.length)` instead of full data
- Implement log rotation and secure storage

---

### 10. **Weak Password Reset OTP Generation** 🟠 HIGH
**Location:** `backend/src/auth/auth.service.ts` (line 120)

**Issue:**
```typescript
const otp = Math.floor(100000 + Math.random() * 900000).toString();
```

**Risk:**
- `Math.random()` is not cryptographically secure
- Predictable OTPs
- Brute force possible

**Recommendation:**
```typescript
import * as crypto from 'crypto';
const otp = crypto.randomInt(100000, 999999).toString();
```

---

## 🟡 MEDIUM SEVERITY VULNERABILITIES

### 11. **XSS via HTML Generation** 🟡 MEDIUM
**Location:** `backend/src/references/references.service.ts` (lines 870-1148)

**Issue:**
```typescript
// Direct string interpolation in HTML
<div class="form-value">${submissionData.recommendation ? 'Yes' : 'No'}</div>
<img src="${submissionData.signature}" />
```

**Risk:**
- If `submissionData` contains malicious HTML/JavaScript, it will be rendered
- PDF generation could execute scripts
- Stored XSS if PDFs are viewed

**Recommendation:**
- Sanitize all user input: `DOMPurify` or `sanitize-html`
- Escape HTML entities: `&lt;`, `&gt;`, `&amp;`
- Validate image URLs (data URIs, external URLs)

---

### 12. **Missing CSRF Protection** 🟡 MEDIUM
**Location:** All POST/PUT/PATCH/DELETE endpoints

**Issue:**
- No CSRF tokens
- CORS allows all origins (makes CSRF easier)
- State-changing operations vulnerable

**Risk:**
- Cross-site request forgery attacks
- Unauthorized actions on behalf of users

**Recommendation:**
- Implement CSRF tokens for state-changing operations
- Use `@nestjs/csrf` or `csurf`
- SameSite cookies
- Verify Origin header

---

### 13. **Insecure API Token Storage** 🟡 MEDIUM
**Location:** `backend/src/api-tokens/api-token.guard.ts`

**Issue:**
- Tokens stored as SHA-256 hashes (good)
- But no rate limiting on token validation
- No IP whitelisting for API tokens
- Tokens can be used from any IP

**Risk:**
- Token brute force (if token leaked, can be used anywhere)
- No geographic restrictions

**Recommendation:**
- Add IP whitelisting for API tokens (optional field)
- Rate limit token validation attempts
- Monitor token usage patterns
- Alert on suspicious activity

---

### 14. **Missing Security Headers** 🟡 MEDIUM
**Location:** `backend/src/main.ts`

**Issue:**
- Only `helmet()` is used (good start)
- But helmet defaults might not be sufficient
- Missing:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy`
  - `Strict-Transport-Security` (HSTS)

**Recommendation:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

### 15. **Weak File Access Control** 🟡 MEDIUM
**Location:** `backend/src/policies/policies-crud.controller.ts` (line 131-153)

**Issue:**
```typescript
@Get(':id/stream')
async stream(@Param('id') id: string, @Query('token') token: string) {
    // Token validated, but...
    // No check if user still has access rights
    // Token doesn't expire after use
}
```

**Risk:**
- Tokens can be reused indefinitely (until expiration)
- No one-time use enforcement
- Shared tokens can be leaked

**Recommendation:**
- Implement one-time tokens (mark as used)
- Shorter expiration (5 minutes instead of 60 seconds)
- Track token usage

---

### 16. **Missing Request Size Limits** 🟡 MEDIUM
**Location:** Global configuration

**Issue:**
- No explicit body parser limits
- Large JSON payloads can cause DoS
- File uploads have limits but JSON doesn't

**Recommendation:**
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

---

## 🟢 LOW SEVERITY / BEST PRACTICES

### 17. **Information Disclosure via Error Messages** 🟢 LOW
**Location:** Multiple controllers

**Issue:**
```typescript
throw new HttpException(
    { success: false, message: error.message }, // Exposes internal errors
    error.status || HttpStatus.INTERNAL_SERVER_ERROR
);
```

**Risk:**
- Stack traces might leak
- Internal paths exposed
- Database structure revealed

**Recommendation:**
- Generic error messages in production
- Log detailed errors server-side only
- Use error codes instead of messages

---

### 18. **Missing Audit Logging** 🟢 LOW
**Location:** All critical operations

**Issue:**
- No audit trail for:
  - User logins/logouts
  - Data access
  - Admin actions
  - File downloads

**Risk:**
- Cannot track security incidents
- Compliance issues
- No forensic capability

**Recommendation:**
- Implement audit logging service
- Log: user, action, timestamp, IP, result
- Store in separate secure database

---

### 19. **Weak Session Management** 🟢 LOW
**Location:** JWT implementation

**Issue:**
- No session invalidation on password change
- No concurrent session limits
- No device fingerprinting

**Recommendation:**
- Invalidate all tokens on password change
- Track active sessions
- Alert on new device login

---

### 20. **Missing Dependency Security Scanning** 🟢 LOW
**Location:** `package.json` files

**Issue:**
- No automated vulnerability scanning
- Outdated dependencies might have CVEs

**Recommendation:**
- Use `npm audit` regularly
- Integrate Snyk or Dependabot
- Keep dependencies updated
- Review security advisories

---

## 📋 IMMEDIATE ACTION ITEMS (Priority Order)

### 🔴 Must Fix Immediately:
1. **Disable TypeORM synchronize** in production
2. **Restrict CORS** to specific origins
3. **Implement rate limiting** on all endpoints
4. **Fix SQL injection** vulnerabilities (use parameterized queries)
5. **Add input validation** DTOs for all endpoints

### 🟠 Fix Within 1 Week:
6. **Secure file uploads** (validation, sanitization, scanning)
7. **Implement CSRF protection**
8. **Add security headers** (CSP, HSTS, etc.)
9. **Fix IDOR vulnerabilities** (verify user ownership)
10. **Improve password reset** (cryptographically secure OTP)

### 🟡 Fix Within 1 Month:
11. **Add audit logging**
12. **Implement token blacklisting**
13. **Sanitize HTML output** (XSS prevention)
14. **Add request size limits**
15. **Remove sensitive data from logs**

---

## 🛡️ SECURITY CHECKLIST

- [ ] TypeORM synchronize disabled in production
- [ ] CORS restricted to specific origins
- [ ] Rate limiting implemented
- [ ] All SQL queries use parameters
- [ ] Input validation on all endpoints
- [ ] File uploads validated and sanitized
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] IDOR vulnerabilities fixed
- [ ] Password reset uses crypto.randomInt
- [ ] Audit logging implemented
- [ ] Token blacklisting implemented
- [ ] HTML output sanitized
- [ ] Request size limits set
- [ ] Sensitive data removed from logs
- [ ] Dependency vulnerabilities scanned
- [ ] Error messages sanitized
- [ ] Session management improved
- [ ] API token IP whitelisting (optional)
- [ ] One-time tokens for file access

---

## 📚 RECOMMENDED SECURITY TOOLS

1. **Rate Limiting:** `@nestjs/throttler`
2. **CSRF Protection:** `@nestjs/csrf` or `csurf`
3. **Input Validation:** `class-validator`, `class-transformer` (already in use)
4. **HTML Sanitization:** `DOMPurify` or `sanitize-html`
5. **Vulnerability Scanning:** `npm audit`, Snyk, Dependabot
6. **Security Headers:** `helmet` (already in use, configure properly)
7. **Audit Logging:** Custom service or `@nestjs/logger`
8. **Token Blacklisting:** Redis
9. **File Scanning:** ClamAV (for virus scanning)

---

## 🔐 SECURITY BEST PRACTICES TO IMPLEMENT

1. **Defense in Depth:** Multiple layers of security
2. **Principle of Least Privilege:** Users only get minimum required access
3. **Fail Secure:** Default to deny, not allow
4. **Input Validation:** Validate and sanitize all inputs
5. **Output Encoding:** Encode all outputs to prevent XSS
6. **Secure by Default:** Secure configurations from the start
7. **Security Monitoring:** Log and monitor all security events
8. **Regular Updates:** Keep dependencies and system updated
9. **Security Testing:** Regular penetration testing
10. **Incident Response Plan:** Have a plan for security incidents

---

**Report Generated:** 2026-03-06  
**Next Review:** After implementing critical fixes
