# 📘 CPD Platform — Complete Application Documentation

## Lets Care All — Staff Management & Continuous Professional Development System

> **Version:** 1.0  
> **Last Updated:** 27 March 2026  
> **Prepared For:** Non-Technical & Technical Readers  

---

## Table of Contents

1. [What Is This Application?](#1-what-is-this-application)
2. [Who Uses This Application?](#2-who-uses-this-application)
3. [Technology Stack (What It's Built With)](#3-technology-stack-what-its-built-with)
4. [High-Level Architecture (How Everything Connects)](#4-high-level-architecture-how-everything-connects)
5. [Application Flow Charts](#5-application-flow-charts)
6. [Frontend — What Users See](#6-frontend--what-users-see)
7. [Backend — The Engine Behind the Scenes](#7-backend--the-engine-behind-the-scenes)
8. [Module-by-Module Breakdown](#8-module-by-module-breakdown)
   - 8.1 [Authentication Module](#81-authentication-module)
   - 8.2 [Users Module](#82-users-module)
   - 8.3 [Staff Module](#83-staff-module)
   - 8.4 [Courses Module](#84-courses-module)
   - 8.5 [Training Module](#85-training-module)
   - 8.6 [Certificates Module](#86-certificates-module)
   - 8.7 [VLE Credentials Module](#87-vle-credentials-module)
   - 8.8 [Policies Module](#88-policies-module)
   - 8.9 [References Module](#89-references-module)
   - 8.10 [Notifications Module](#810-notifications-module)
   - 8.11 [Email Module](#811-email-module)
   - 8.12 [API Tokens Module](#812-api-tokens-module)
   - 8.13 [N8N Automation Module](#813-n8n-automation-module)
9. [Database Structure (How Data Is Stored)](#9-database-structure-how-data-is-stored)
10. [Security Features](#10-security-features)
11. [File & Folder Structure](#11-file--folder-structure)
12. [How to Run the Application](#12-how-to-run-the-application)
13. [Glossary (Key Terms Explained)](#13-glossary-key-terms-explained)

---

## 1. What Is This Application?

This is a **Staff Management and Continuous Professional Development (CPD) Platform** built for **Lets Care All Ltd**, a care services company based in the UK.

**In simple terms**, imagine a digital office that helps the company:

- **Register and manage care staff** — like a digital HR file for each employee.
- **Track training courses** — which courses each staff member needs, which ones they've started, and which ones they've completed.
- **Generate and manage certificates** — when a staff member completes a course, the system automatically creates a professional PDF certificate.
- **Manage company policies** — upload policy documents, track which staff have read them, and how long they spent reading.
- **Handle references** — when hiring new staff, the system sends reference request forms to referees via email with secure links, and tracks submissions.
- **Send notifications** — the system alerts staff about new certificates, policies to read, and more.
- **Provide a dashboard for admins** — a control panel showing statistics about all staff, their training progress, and more.

**Think of it as a combination of:**
- An **HR system** (staff profiles, addresses, documents)
- A **Learning Management System** (courses, training plans, certificates)
- A **Compliance Tracker** (policies, policy reading sessions)
- A **Reference Checker** (sending and tracking employment/character references)

---

## 2. Who Uses This Application?

There are **two types of users (roles)**:

### 👤 Admin (Manager/HR)
- Can see and manage ALL staff profiles
- Can add/edit courses
- Can assign, complete, and revoke certificates
- Can upload and manage company policies
- Can view analytics and reports
- Can send reference requests
- Can manage VLE (Virtual Learning Environment) credentials
- Can view the admin dashboard with statistics
- Can generate PDF reports (monthly, yearly, enrollment)

### 👥 Staff (Care Workers)
- Can view and edit their OWN profile only
- Can see their assigned courses and training progress
- Can view and download their own certificates
- Can read company policies (tracked by the system)
- Can see their VLE login credentials
- Can manage their own references
- Can see their own notifications

```
┌─────────────────────────────────────────────────────┐
│                   WHO USES IT?                       │
├──────────────────────┬──────────────────────────────┤
│       ADMIN          │          STAFF               │
├──────────────────────┼──────────────────────────────┤
│ • Dashboard Overview │ • View Own Profile           │
│ • Manage ALL Staff   │ • View Own Certificates      │
│ • Manage Courses     │ • View Own Training Plan     │
│ • Issue Certificates │ • Read Policies              │
│ • Upload Policies    │ • View VLE Credentials       │
│ • View Analytics     │ • View Notifications         │
│ • Send References    │ • Manage Own References      │
│ • Generate Reports   │ • Update Personal Details    │
│ • Manage API Tokens  │                              │
└──────────────────────┴──────────────────────────────┘
```

---

## 3. Technology Stack (What It's Built With)

### Frontend (What the user sees in the browser)
| Technology | Purpose |
|---|---|
| **React 19** | JavaScript library for building the user interface |
| **TypeScript** | JavaScript with type safety (fewer bugs) |
| **Mantine UI** | Pre-built visual components (buttons, tables, modals) |
| **Vite** | Fast development server and build tool |
| **React Router** | Navigation between pages |
| **Axios** | Sends data requests to the backend server |
| **Lucide React** | Icon library |
| **Framer Motion** | Animations |

### Backend (The server-side logic)
| Technology | Purpose |
|---|---|
| **NestJS** | Server framework (handles requests, business logic) |
| **TypeScript** | Type-safe server code |
| **TypeORM** | Communicates with the database |
| **PostgreSQL** | The database where all data is stored |
| **Passport + JWT** | User login and authentication |
| **Bcrypt** | Password encryption (hashing) |
| **Puppeteer** | Generates PDF certificates and reports |
| **Nodemailer** | Sends emails (OTPs, references, reminders) |
| **Multer** | Handles file uploads (profile pictures, policy PDFs) |
| **Helmet** | Security headers for the server |
| **Throttler** | Rate limiting (prevents abuse) |

```
┌──────────────────────────────────────────────────────────────┐
│                    TECHNOLOGY STACK                            │
│                                                                │
│  ┌─────────── FRONTEND ───────────┐  ┌── BACKEND ──────────┐ │
│  │ React 19 + TypeScript          │  │ NestJS + TypeScript  │ │
│  │ Mantine UI (visual components) │  │ TypeORM (DB access)  │ │
│  │ Vite (dev server & build)      │──│ Passport JWT (auth)  │ │
│  │ React Router (navigation)      │  │ Puppeteer (PDFs)     │ │
│  │ Axios (API calls)              │  │ Nodemailer (emails)  │ │
│  └────────────────────────────────┘  │ Multer (file upload) │ │
│                                       └─────────┬────────────┘ │
│                                                  │              │
│                                       ┌──────────▼──────────┐  │
│                                       │   PostgreSQL DB      │  │
│                                       │  (stores all data)   │  │
│                                       └─────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. High-Level Architecture (How Everything Connects)

```
                        ┌──────────────┐
                        │   INTERNET    │
                        │  (Browser)    │
                        └──────┬───────┘
                               │
                    ┌──────────▼──────────┐
                    │   FRONTEND (React)   │
                    │   Port: 5173 (dev)   │
                    │   or 81 (production) │
                    │                      │
                    │  • Landing Page      │
                    │  • Login/Register    │
                    │  • Dashboard         │
                    │  • Staff Profiles    │
                    │  • Courses           │
                    │  • Policies          │
                    │  • Settings          │
                    └──────────┬──────────┘
                               │
                     HTTP API Calls (JSON)
                      /api/v1/...
                               │
                    ┌──────────▼──────────┐
                    │   BACKEND (NestJS)   │
                    │   Port: 3000         │
                    │                      │
                    │  ┌────────────────┐  │
                    │  │  Auth Module   │  │  ← Login, Register, Password Reset
                    │  ├────────────────┤  │
                    │  │  Staff Module  │  │  ← Profiles, Addresses, Reviews, Reports
                    │  ├────────────────┤  │
                    │  │ Courses Module │  │  ← Course Catalog Management
                    │  ├────────────────┤  │
                    │  │Training Module │  │  ← Training Plans & Progress
                    │  ├────────────────┤  │
                    │  │  Certs Module  │  │  ← Certificate Generation & PDFs
                    │  ├────────────────┤  │
                    │  │Policies Module │  │  ← Policy CRUD, Reading Sessions, Analytics
                    │  ├────────────────┤  │
                    │  │  Refs Module   │  │  ← Reference Requests & Submissions
                    │  ├────────────────┤  │
                    │  │  VLE Module    │  │  ← Virtual Learning Environment Credentials
                    │  ├────────────────┤  │
                    │  │ Notifs Module  │  │  ← In-App Notifications
                    │  ├────────────────┤  │
                    │  │ Email Module   │  │  ← Sending Emails (OTPs, References)
                    │  ├────────────────┤  │
                    │  │API Tokens Mod. │  │  ← External API Authentication
                    │  ├────────────────┤  │
                    │  │ N8N Automation │  │  ← External Automation Integration
                    │  └────────────────┘  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    PostgreSQL DB      │
                    │                      │
                    │  Tables:             │
                    │  • users             │
                    │  • staff_profiles    │
                    │  • address_history   │
                    │  • review_forms      │
                    │  • courses           │
                    │  • training_records  │
                    │  • certificates      │
                    │  • vle_credentials   │
                    │  • policies          │
                    │  • policy_reading_   │
                    │    sessions          │
                    │  • policy_           │
                    │    notifications     │
                    │  • references        │
                    │  • notifications     │
                    │  • api_tokens        │
                    │  • plans             │
                    │  • reminders         │
                    └─────────────────────┘
```

---

## 5. Application Flow Charts

### 5.1 User Registration & Login Flow

```
┌────────────────────────────────────────────────────────────────┐
│                  REGISTRATION FLOW                              │
└────────────────────────────────────────────────────────────────┘

  User opens /register
        │
        ▼
  Fills in: Email, Password, First Name,
  Last Name, Phone, ILCCS Number
        │
        ▼
  Frontend sends POST /api/v1/auth/register
        │
        ▼
  ┌─────────────────────────┐
  │ Backend validates input  │
  │ (email format, password  │
  │  strength: 8+ chars,     │
  │  uppercase, lowercase,   │
  │  number, special char)   │
  └────────────┬────────────┘
               │
        ┌──────▼──────┐
        │ Email exists │──YES──▶ Return error "Invalid request"
        │  already?    │
        └──────┬──────┘
               │NO
               ▼
  Password is HASHED (encrypted one-way)
  using bcrypt with 12 rounds
               │
               ▼
  New User record created in DB
  (role defaults to STAFF)
               │
               ▼
  Staff Profile record created
  (firstName, lastName, phone, ilccsNumber)
               │
               ▼
  ✅ Registration complete!
  User redirected to Login page


┌────────────────────────────────────────────────────────────────┐
│                     LOGIN FLOW                                  │
└────────────────────────────────────────────────────────────────┘

  User opens /login
        │
        ▼
  Chooses: Admin Login OR Staff Login
        │
        ▼
  Enters Email + Password
        │
        ▼
  Frontend sends POST /api/v1/auth/login/admin
  OR POST /api/v1/auth/login/staff
        │
        ▼
  ┌──────────────────────────────────────┐
  │ Backend checks:                       │
  │ 1. Does email exist?                  │
  │ 2. Is the role correct (admin/staff)? │
  │ 3. Is the account active?             │
  │ 4. Does password match the hash?      │
  └──────────────┬───────────────────────┘
                 │
          ┌──────▼──────┐
          │ All checks  │──NO──▶ Return "Invalid credentials"
          │  passed?    │       (no hint about which check failed)
          └──────┬──────┘
                 │YES
                 ▼
  JWT Token generated (contains user ID + role)
  Last login timestamp updated
                 │
                 ▼
  Response: { access_token, user: { id, email, role, name } }
                 │
                 ▼
  Frontend stores token in localStorage
  Redirects to Dashboard (admin) or Profile (staff)
```

### 5.2 Password Reset Flow

```
┌────────────────────────────────────────────────────────────────┐
│                 PASSWORD RESET FLOW                              │
└────────────────────────────────────────────────────────────────┘

  User clicks "Forgot Password?"
        │
        ▼
  ┌─── STEP 1: Request OTP ───┐
  │                            │
  │  User enters their email   │
  │  POST /api/v1/auth/        │
  │    forgot-password          │
  │                            │
  │  Rate Limited: 5 requests  │
  │  per 15 minutes            │
  └────────────┬───────────────┘
               │
               ▼
  Backend generates 6-digit OTP code
  OTP is hashed (bcrypt) and saved to DB
  OTP expires in 15 minutes
               │
               ▼
  Email sent with OTP code
  (even if email not found → same generic message)
  "If the email exists, an OTP has been sent"
               │
               ▼
  ┌─── STEP 2: Verify OTP ────┐
  │                            │
  │  User enters the 6 digits  │
  │  POST /api/v1/auth/        │
  │    verify-otp               │
  │                            │
  │  Rate Limited: 10 requests │
  │  per 15 minutes            │
  └────────────┬───────────────┘
               │
          ┌────▼────┐
          │  Valid?  │──NO──▶ "Invalid OTP" or "OTP expired"
          └────┬────┘
               │YES
               ▼
  ┌─── STEP 3: Set New Password ─┐
  │                               │
  │  User enters new password     │
  │  POST /api/v1/auth/           │
  │    reset-password              │
  │                               │
  │  OTP verified again (strict)  │
  └───────────────┬───────────────┘
                  │
                  ▼
  New password hashed with bcrypt (12 rounds)
  Saved to DB
  OTP & OTP Expiry CLEARED (cannot be reused)
                  │
                  ▼
  ✅ "Password reset successfully"
  User redirected to Login page
```

### 5.3 Certificate Generation Flow

```
┌────────────────────────────────────────────────────────────────┐
│               CERTIFICATE GENERATION FLOW                       │
└────────────────────────────────────────────────────────────────┘

  Admin clicks "Mark Complete" on a course
  for a staff member
        │
        ▼
  PATCH /api/v1/certificates/:id/complete
        │
        ▼
  ┌──────────────────────────────────┐
  │ 1. Validate certificate exists    │
  │ 2. Fetch staff profile            │
  │    (get full name for cert)       │
  │ 3. Check: already completed?      │
  │    If yes → send notification     │
  │    and return existing cert       │
  └──────────────┬───────────────────┘
                 │ (New completion)
                 ▼
  ┌──── Generate Registration No ────┐
  │                                   │
  │  Format: LCA-CERT-2026-001       │
  │  (Year + Sequential Number)       │
  │                                   │
  │  Retries up to 5 times for       │
  │  unique number                    │
  └──────────────┬───────────────────┘
                 │
                 ▼
  ┌──── Determine Certificate Date ──┐
  │                                   │
  │  Priority:                        │
  │  1. Existing cert date            │
  │  2. Training plan completion date │
  │  3. Current date (fallback)       │
  └──────────────┬───────────────────┘
                 │
                 ▼
  ┌──── Generate PDF Certificate ────┐
  │                                   │
  │  1. Launch headless browser       │
  │     (Puppeteer/Chromium)          │
  │                                   │
  │  2. Load HTML certificate         │
  │     template                      │
  │                                   │
  │  3. Insert background image       │
  │     (base64 encoded)              │
  │                                   │
  │  4. Replace placeholders:         │
  │     • {Learner_Name}              │
  │     • {Course_Name}               │
  │     • {Reg_no}                    │
  │     • {Date}                      │
  │                                   │
  │  5. Render to PDF file            │
  │     Saved to:                     │
  │     uploads/certificates/{userId} │
  │     /{certId}.pdf                 │
  └──────────────┬───────────────────┘
                 │
                 ▼
  Update certificate record in DB:
  status = COMPLETED
  filePath, issuedAt, verificationCode
                 │
                 ▼
  Sync training record → COMPLETED
                 │
                 ▼
  Send notification to staff:
  "Your certificate for X is ready"
                 │
                 ▼
  ✅ Certificate ready for viewing/download!
```

### 5.4 Policy Reading Flow

```
┌────────────────────────────────────────────────────────────────┐
│                  POLICY READING FLOW                            │
└────────────────────────────────────────────────────────────────┘

  Admin uploads a new policy PDF
  POST /api/v1/policies-crud
        │
        ▼
  Policy saved to DB + file to uploads/policies/
  Notifications created for ALL active staff
  ("You have a new policy to read")
        │
        ▼
  Staff member sees notification badge
  (polled every 60 seconds)
        │
        ▼
  Staff opens the policy page & clicks "Read"
        │
        ▼
  ┌──── START READING SESSION ───────┐
  │                                   │
  │  POST /api/v1/policies/           │
  │    start-reading                  │
  │                                   │
  │  • Cancels any other in-progress  │
  │    sessions for this staff        │
  │  • Creates new session:           │
  │    status = IN_PROGRESS           │
  │    startTime = now                │
  └──────────────┬───────────────────┘
                 │
                 ▼
  Staff reads the policy document
  (PDF viewer embedded in page)
                 │
  ┌──────────────▼───────────────────┐
  │  Time passes (minimum 30 seconds │
  │  required for valid reading)     │
  └──────────────┬───────────────────┘
                 │
                 ▼
  ┌──── FINISH READING SESSION ──────┐
  │                                   │
  │  POST /api/v1/policies/           │
  │    finish-reading/:sessionId      │
  │                                   │
  │  Calculates duration:             │
  │  endTime - startTime              │
  │                                   │
  │  If < 30 seconds → REJECTED      │
  │  "Reading session too short"      │
  │                                   │
  │  If ≥ 30 seconds → COMPLETED     │
  │  Policy notification marked read  │
  └──────────────┬───────────────────┘
                 │
                 ▼
  ✅ Reading session recorded!
  Admin can view analytics:
  • Who read which policy
  • How long they spent
  • Which staff haven't read yet
```

### 5.5 Reference Request Flow

```
┌────────────────────────────────────────────────────────────────┐
│                REFERENCE REQUEST FLOW                            │
└────────────────────────────────────────────────────────────────┘

  Admin/Staff creates a reference request
  (for Personal or Professional reference)
        │
        ▼
  POST /api/v1/staff/:staffId/references/send-link
        │
        ▼
  ┌──────────────────────────────────┐
  │ 1. Generate secure random token  │
  │    (64 hex chars)                │
  │                                  │
  │ 2. Create reference record in DB │
  │    status = PENDING              │
  │                                  │
  │ 3. Build secure URL:             │
  │    {baseUrl}/reference/submit/   │
  │    {token}                       │
  │                                  │
  │ 4. Send email to referee with    │
  │    "Complete Reference Form"     │
  │    button                        │
  └──────────────┬───────────────────┘
                 │
                 ▼
  Referee receives email
  Clicks the secure link
        │
        ▼
  ┌──── REFEREE OPENS LINK ──────────┐
  │                                   │
  │  GET /api/v1/references/          │
  │    validate/:token                │
  │                                   │
  │  Checks:                          │
  │  • Token exists?                  │
  │  • Not expired? (14 days)         │
  │  • Not already submitted?         │
  │                                   │
  │  Marks: status = OPENED           │
  │  Records: openedAt = now          │
  └──────────────┬───────────────────┘
                 │
                 ▼
  Referee fills out the form:
  • Character criteria ratings OR
  • Professional employment details
  • Comments, Signature
        │
        ▼
  ┌──── REFEREE SUBMITS ─────────────┐
  │                                   │
  │  POST /api/v1/references/         │
  │    submit/:token                  │
  │                                   │
  │  Saves submission data (JSON)     │
  │  status = SUBMITTED               │
  │  submittedAt = now                │
  │  Records IP address               │
  └──────────────┬───────────────────┘
                 │
                 ▼
  ✅ Reference submitted!
  Admin can view it and download
  as a filled PDF.

  ┌──── AUTO-REMINDERS ──────────────┐
  │                                   │
  │  If no response after 3 days:     │
  │  System can send reminder emails  │
  │  (triggered manually or via N8N)  │
  │                                   │
  │  Reminders continue until         │
  │  referee submits                  │
  └──────────────────────────────────┘
```

### 5.6 Complete User Journey — Staff Member

```
┌────────────────────────────────────────────────────────────────┐
│           COMPLETE STAFF MEMBER JOURNEY                         │
└────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌──────────┐     ┌──────────────┐
  │ Register │────▶│  Login   │────▶│  My Profile  │
  │ (once)   │     │ (daily)  │     │  (home page) │
  └─────────┘     └──────────┘     └──────┬───────┘
                                          │
               ┌──────────────────────────┼──────────────────┐
               │                          │                   │
               ▼                          ▼                   ▼
     ┌─────────────────┐    ┌──────────────────┐   ┌────────────────┐
     │  View Courses    │    │  Read Policies   │   │ View My Certs  │
     │  & Training Plan │    │  (tracked time)  │   │ & Download     │
     │                  │    │                  │   │                │
     │  See which       │    │  PDF viewer      │   │  View in       │
     │  courses are     │    │  with timer      │   │  browser or    │
     │  assigned and    │    │                  │   │  download PDF  │
     │  their status    │    │  Min 30 sec      │   │                │
     └─────────────────┘    └──────────────────┘   └────────────────┘
               │                          │                   │
               ▼                          ▼                   ▼
     ┌─────────────────┐    ┌──────────────────┐   ┌────────────────┐
     │  View VLE Creds  │    │  Notifications   │   │  References    │
     │  (Login details  │    │  (bell icon)     │   │  (Personal &   │
     │   for online     │    │                  │   │  Professional) │
     │   learning)      │    │  New certs,      │   │                │
     │                  │    │  new policies    │   │  View status   │
     └─────────────────┘    └──────────────────┘   └────────────────┘
```

### 5.7 Complete User Journey — Admin

```
┌────────────────────────────────────────────────────────────────┐
│              COMPLETE ADMIN JOURNEY                              │
└────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌───────────────────────────────────────┐
  │  Login   │────▶│           ADMIN DASHBOARD              │
  │ (admin)  │     │                                        │
  └──────────┘     │  Statistics:                           │
                   │  • Total staff count                   │
                   │  • Active staff count                  │
                   │  • Certificates issued                 │
                   │  • Training completion rates           │
                   │  • Staff list with search              │
                   └───────────────┬───────────────────────┘
                                   │
      ┌────────────┬───────────────┼───────────────┬────────────┐
      │            │               │               │            │
      ▼            ▼               ▼               ▼            ▼
┌──────────┐┌──────────┐  ┌──────────────┐┌──────────┐┌──────────────┐
│ Staff    ││ Courses  │  │  Policies    ││References││  Settings    │
│ Profiles ││ Manager  │  │  Manager     ││ & Analy. ││              │
│          ││          │  │              ││          ││ • API Tokens │
│ • View   ││ • Add    │  │ • Upload PDF ││ • View   ││ • Change     │
│ • Edit   ││ • Edit   │  │ • Activate/  ││   all    ││   password   │
│ • Photos ││ • Delete │  │   Deactivate ││ • Send   ││              │
│ • Address││ • Assign │  │ • Analytics  ││   remind ││              │
│ • Review ││   to     │  │ • Reports    ││ • Track  ││              │
│   forms  ││   staff  │  │ • Sessions   ││   status ││              │
│ • Certs  ││          │  │              ││ • PDF    ││              │
│ • Reports││          │  │              ││          ││              │
└──────────┘└──────────┘  └──────────────┘└──────────┘└──────────────┘
```

---

## 6. Frontend — What Users See

The frontend is the visual part of the application — the web pages that users interact with in their browser.

### 6.1 Pages Overview

| Page | URL | Who Can Access | What It Does |
|---|---|---|---|
| **Landing Page** | `/` | Everyone | Welcome page with company info |
| **Login Page** | `/login` | Everyone | Login form (Admin / Staff tabs) |
| **Register Page** | `/register` | Everyone (or Admin-created) | New staff registration form |
| **Forgot Password** | `/forgot-password` | Everyone | 3-step password reset |
| **Admin Dashboard** | `/dashboard` | Admin only | Overview statistics + staff list |
| **Staff Profile** | `/dashboard/staff/:id` | Admin only | View/edit any staff member's profile |
| **My Profile** | `/dashboard/me` | All logged-in users | View/edit own profile |
| **Courses** | `/courses` | All logged-in users | Course catalog and management |
| **Policies** | `/dashboard/policies` | All logged-in users | View and read policies |
| **Policy Reports** | `/dashboard/policies/reports` | Admin only | Policy reading reports |
| **Policy Management** | `/dashboard/policies/manage` | Admin only | Upload/edit/delete policies |
| **Policy Analytics** | `/dashboard/policies/analytics` | Admin only | Policy reading statistics |
| **Reference Analytics** | `/dashboard/references/analytics` | Admin only | Reference tracking dashboard |
| **Reference Submission** | `/reference/submit/:token` | Public (via link) | Referee fills out reference form |
| **Settings** | `/settings` | All logged-in users | Account settings |
| **API Tokens** | `/settings/api-tokens` | All logged-in users | Manage API access tokens |

### 6.2 Profile Page Tabs

The staff profile page has multiple tabs, each showing different information:

| Tab | What It Shows |
|---|---|
| **Personal Details** | First name, last name, middle name, phone, email, ILCCS number, LCA number, employment status, title, date of birth |
| **Personal Information** | Additional personal data and documents |
| **Identity & Address** | Address history (line1, line2, town, postcode, dates) with add/delete |
| **References** | Personal and professional references with status tracking |

### 6.3 How the Frontend Protects Routes

```
┌───────────────────────────────────────────────────────┐
│                 ROUTE PROTECTION                       │
│                                                        │
│  User visits a page                                    │
│        │                                               │
│        ▼                                               │
│  ┌──────────────────┐                                  │
│  │ Is there a valid  │──NO──▶ Redirect to /login       │
│  │ JWT token in      │                                  │
│  │ localStorage?     │                                  │
│  └────────┬─────────┘                                  │
│           │ YES                                        │
│           ▼                                            │
│  ┌──────────────────┐                                  │
│  │ Is token expired? │──YES──▶ Clear token, go /login  │
│  └────────┬─────────┘                                  │
│           │ NO                                         │
│           ▼                                            │
│  ┌──────────────────┐                                  │
│  │ Admin-only page?  │──YES──▶ Is role "admin"?        │
│  └────────┬─────────┘          │NO → Redirect /me      │
│           │ NO                 │YES → Show page         │
│           ▼                                            │
│  ✅ Show the page                                      │
└───────────────────────────────────────────────────────┘
```

---

## 7. Backend — The Engine Behind the Scenes

The backend is the server that processes all data. Users never see it directly — they interact with it through the frontend.

### 7.1 How a Request Travels Through the Backend

```
  Frontend sends HTTP request
  (e.g., GET /api/v1/staff/me)
        │
        ▼
  ┌─── GLOBAL MIDDLEWARE ────────────────────────┐
  │                                               │
  │  1. Helmet (security headers)                 │
  │  2. CORS check (allowed origins only)         │
  │  3. Body size limit (max 10MB)                │
  │  4. Rate limiter (100 req/min globally)       │
  │  5. Validation Pipe (check input format)      │
  └──────────────────────┬───────────────────────┘
                         │
                         ▼
  ┌─── ROUTE-LEVEL GUARDS ──────────────────────┐
  │                                               │
  │  1. AuthGuard('jwt')                          │
  │     → Extracts JWT from Authorization header  │
  │     → Verifies signature & expiry             │
  │     → Attaches user info to request           │
  │                                               │
  │  2. RolesGuard                                │
  │     → Checks if user role matches             │
  │       @Roles(ADMIN) or @Roles(STAFF)          │
  │                                               │
  │  3. ThrottleGuard (optional per-route)        │
  │     → Extra rate limits on sensitive routes    │
  └──────────────────────┬───────────────────────┘
                         │
                         ▼
  ┌─── CONTROLLER ──────────────────────────────┐
  │                                               │
  │  Receives the request                         │
  │  Extracts parameters, body, user info         │
  │  Calls the appropriate Service method         │
  └──────────────────────┬───────────────────────┘
                         │
                         ▼
  ┌─── SERVICE ─────────────────────────────────┐
  │                                               │
  │  Contains the business logic                  │
  │  Talks to the Database via Repository         │
  │  May call other services (Email, etc.)        │
  │  Returns data to Controller                   │
  └──────────────────────┬───────────────────────┘
                         │
                         ▼
  ┌─── REPOSITORY (TypeORM) ────────────────────┐
  │                                               │
  │  Translates code into SQL queries             │
  │  Sends queries to PostgreSQL                  │
  │  Returns results                              │
  └──────────────────────┬───────────────────────┘
                         │
                         ▼
  Response sent back to Frontend (JSON)
```

### 7.2 All API Endpoints

Below is every API endpoint the backend provides:

#### Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login/admin` | Public | Admin login |
| POST | `/auth/login/staff` | Public | Staff login |
| POST | `/auth/register` | Public | Register new staff |
| GET | `/auth/profile` | Authenticated | Get logged-in user info |
| GET | `/auth/admin` | Admin only | Verify admin access |
| POST | `/auth/forgot-password` | Public | Request password reset OTP |
| POST | `/auth/verify-otp` | Public | Verify OTP code |
| POST | `/auth/reset-password` | Public | Reset password with OTP |

#### Staff Profiles (`/api/v1/staff`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/staff/me` | Staff | Get own profile |
| PUT | `/staff/me` | Staff | Update own profile |
| GET | `/staff` | Admin | Get all staff profiles |
| GET | `/staff/stats` | Admin | Get staff statistics |
| GET | `/staff/:id` | Admin/Self | Get profile by user ID |
| PUT | `/staff/:id` | Admin | Update profile by user ID |
| GET | `/staff/:id/addresses` | Admin/Self | Get address history |
| POST | `/staff/:id/addresses` | Admin/Self | Add new address |
| DELETE | `/staff/:id/addresses/:aid` | Admin/Self | Remove address |
| POST | `/staff/:id/review-forms` | Admin | Create review form |
| GET | `/staff/:id/review-forms` | Admin/Self | Get review forms |
| GET | `/staff/:id/review-forms/:fid` | Admin/Self | Get single review form |
| POST | `/staff/:id/upload-photo` | Admin/Self | Upload profile picture |
| GET | `/staff/:id/profile-picture` | Admin/Self | Get profile picture |
| GET | `/staff/:id/report/monthly` | Admin | Download monthly report PDF |
| GET | `/staff/:id/report/yearly` | Admin | Download yearly report PDF |
| GET | `/staff/:id/report/enrollment` | Admin | Download enrollment report PDF |

#### Dashboard (`/api/v1/dashboard`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/dashboard/stats` | Admin | Get dashboard statistics |

#### Certificates (`/api/v1/certificates`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/certificates` | Authenticated | Get all certificates (admin=all, staff=own) |
| GET | `/certificates/staff/:userId` | Admin/Self | Get certificates for user |
| POST | `/certificates` | Admin | Create/assign certificate |
| PATCH | `/certificates/:id/complete` | Admin | Mark certificate complete (generates PDF) |
| PATCH | `/certificates/:id/incomplete` | Admin | Revert certificate to pending |
| GET | `/certificates/:id/view` | Admin/Self | View certificate PDF inline |
| GET | `/certificates/:id/download` | Admin | Download certificate PDF |
| GET | `/certificates/:id/view-token` | Admin/Self | Get temporary view token |
| GET | `/certificates/:id/stream` | Public (token) | Stream PDF using temp token |

#### Training (`/api/v1/training`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/training/staff/:userId` | Authenticated | Get training records for user |
| PATCH | `/training/staff/:userId/record` | Authenticated | Update/create training record |
| DELETE | `/training/staff/:userId/record/:id` | Authenticated | Delete training record |

#### Courses (`/api/v1/courses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/courses` | Authenticated | List all courses |
| POST | `/courses` | Admin | Create new course |
| PUT | `/courses/:id` | Admin | Update course |
| DELETE | `/courses/:id` | Admin | Delete course |

#### VLE Credentials (`/api/v1/vle-credentials`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/vle-credentials/:userId` | Admin/Self | Get VLE credentials |
| PUT | `/vle-credentials/:userId` | Admin | Update VLE credentials |

#### Policies
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/policies-crud` | Authenticated | List policies (admin=all, staff=active) |
| POST | `/policies-crud` | Admin | Upload new policy |
| PUT | `/policies-crud/:id` | Admin | Update policy |
| DELETE | `/policies-crud/:id` | Admin | Delete policy |
| GET | `/policies-crud/:id/stream` | Authenticated | View policy PDF |
| POST | `/policies/start-reading` | Staff | Start reading session |
| POST | `/policies/finish-reading/:id` | Staff | Finish reading session |
| POST | `/policies/cancel-reading/:id` | Staff | Cancel reading session |
| POST | `/policies/complete-from-client/:id` | Staff | Complete session from client |
| GET | `/policies/my-sessions` | Staff | Get own reading sessions |
| GET | `/policies/admin/sessions` | Admin | Get all reading sessions |
| GET | `/policies/admin/sessions/:id` | Admin | Get specific session |

#### References
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/staff/:staffId/references` | Admin/Self | List references for staff |
| POST | `/staff/:staffId/references` | Admin/Self | Create reference |
| POST | `/staff/:staffId/references/send-link` | Admin/Self | Send reference with secure link |
| POST | `/staff/:staffId/references/:id/reminder` | Admin | Send reminder |
| GET | `/references/validate/:token` | Public | Open reference form via link |
| POST | `/references/submit/:token` | Public | Submit reference form |
| GET | `/references/analytics` | Admin | Reference analytics |
| GET | `/references/analytics/all` | Admin | All references detail |
| POST | `/references/admin/send-reminders` | Admin | Send bulk reminders |

#### Notifications (`/api/v1/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/notifications` | Authenticated | Get user's notifications |
| PATCH | `/notifications/:id/read` | Authenticated | Mark notification as read |
| PATCH | `/notifications/read-all` | Authenticated | Mark all as read |

#### API Tokens (`/api/v1/api-tokens`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api-tokens` | Authenticated | Create API token |
| GET | `/api-tokens` | Authenticated | List user's API tokens |
| DELETE | `/api-tokens/:id` | Authenticated | Delete API token |

#### N8N Automation (`/api/v1/n8n`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/n8n/enroll-user` | API Token | Enroll user in plan |
| POST | `/n8n/plans` | API Token | Create training plan |
| GET | `/n8n/plans/:userId` | API Token | Get user's plans |
| POST | `/n8n/reminders` | API Token | Create reminder |
| GET | `/n8n/reminders/pending` | API Token | Get pending reminders |
| PATCH | `/n8n/reminders/:id/sent` | API Token | Mark reminder as sent |

---

## 8. Module-by-Module Breakdown

### 8.1 Authentication Module

**Purpose:** Handles how users prove who they are (login) and create new accounts (register).

**Files:**
- `auth.controller.ts` — Defines the API endpoints
- `auth.service.ts` — Contains the login/register/reset logic
- `auth.dto.ts` — Defines what data the endpoints expect
- `jwt.strategy.ts` — Verifies JWT tokens
- `roles.decorator.ts` — `@Roles()` decorator for marking who can access
- `roles.guard.ts` — Enforces role requirements

**How It Works:**

1. **Registration:** Takes email, password (hashed with bcrypt), first/last name, phone, ILCCS number. Creates a User record (role=STAFF) and a StaffProfile record.

2. **Login:** Validates email + password. Returns a JWT token (like a digital key) that expires after a configured time.

3. **Password Reset:** 3-step process using a 6-digit OTP sent via email. OTP is hashed and expires in 15 minutes.

**Security Features:**
- Passwords hashed with bcrypt (12 rounds) — cannot be reversed
- JWT tokens for stateless authentication
- Rate limiting on login (5 attempts per 15 min)
- Generic error messages (don't reveal if email exists)
- OTP cleared after use (cannot be reused)

---

### 8.2 Users Module

**Purpose:** Manages the basic user accounts in the database.

**Key Entity Fields:**
| Field | Description |
|---|---|
| id | Unique identifier (UUID) |
| email | Login email (unique) |
| password | Hashed password (hidden by default) |
| role | ADMIN or STAFF |
| isActive | Whether account is enabled |
| lastLoginAt | When they last logged in |
| resetOtp | Hashed OTP for password reset |
| resetOtpExpiry | When the OTP expires |

---

### 8.3 Staff Module

**Purpose:** Manages staff profiles, addresses, review forms, and generates PDF reports.

**This is the largest module**, handling:

#### Staff Profile
Each staff member has a profile with:
- Personal details (name, DOB, phone, title)
- Employment details (ILCCS number, LCA number, employment status)
- Dates (induction, rapid induction)
- Profile picture

#### Address History
Staff can have multiple address records (for compliance/DBS checks):
- Line 1, Line 2, Town, Postcode
- Date From, Date To

#### Review Forms
Admin creates performance reviews/appraisals for staff:
- Types: review, appraisal, supervision
- Sub-types: 2nd Month, 4th Month, 6th Month, etc.
- Grades for: Job Performance, Training, Communication, Attendance
- Signatures from staff and reviewer

#### PDF Report Generation
The system generates three types of PDF reports using Puppeteer:

1. **Monthly Report** — Shows training and review activities for a specific month
2. **Yearly Report** — Shows all training and reviews for an entire year
3. **Enrollment Completion Report** — Summary of course enrollment dates and completion dates

```
┌────────────────────────────────────────────────┐
│         STAFF MODULE RELATIONSHIPS              │
│                                                  │
│  ┌──────────┐    1    ┌────────────────┐        │
│  │   User   │────────▶│ Staff Profile  │        │
│  └──────────┘         └───────┬────────┘        │
│                               │                  │
│                    ┌──────────┼──────────┐       │
│                    │          │          │       │
│                    ▼          ▼          ▼       │
│           ┌──────────┐ ┌──────────┐ ┌────────┐ │
│           │ Address  │ │ Review   │ │Training│ │
│           │ History  │ │ Forms    │ │Records │ │
│           │ (many)   │ │ (many)   │ │(many)  │ │
│           └──────────┘ └──────────┘ └────────┘ │
└────────────────────────────────────────────────┘
```

---

### 8.4 Courses Module

**Purpose:** Manages the course catalog — the list of all available training courses.

The system comes pre-loaded with **38+ mandatory courses** and many additional/specialist courses, organized by month (Month 1-12).

**Course Categories:**
- **Mandatory** — Required for all staff (e.g., Safeguarding, Infection Control, Fire Safety)
- **Additional** — Extra courses (e.g., Diabetes Awareness, Epilepsy)
- **Specialist** — Advanced topics (e.g., End of Life Care, Stoma Care)
- **Other** — Custom courses with sub-modules

**Each course has:**
| Field | Example |
|---|---|
| Title | "Certificate in Safeguarding Adults" |
| Month | 1 (which month in the training plan) |
| Provider | "Lets Care All Internal" |
| Duration | "2 hours" |
| Categories | ["mandatory"] |
| Sub-Modules | Optional list of topics |

---

### 8.5 Training Module

**Purpose:** Tracks each staff member's progress through their training plan.

**How It Works:**
1. When a staff member is registered, they need to complete courses over 12 months.
2. Each course creates a **Training Record** with:
   - Enrollment Date (when they started)
   - Due Date (when it should be completed)
   - Completed At (when they finished)
   - Status: PENDING or COMPLETED

3. **Auto-Sync with Certificates:** When a certificate is marked as complete, the training record is automatically updated to COMPLETED. And vice versa — if a certificate is reverted, the training record goes back to PENDING.

```
┌──────────────────────────────────────────────┐
│         TRAINING ↔ CERTIFICATE SYNC          │
│                                               │
│  Certificate marked COMPLETE                  │
│        │                                      │
│        ▼                                      │
│  Training Record → COMPLETED                  │
│  completedAt = certificate.issuedAt           │
│                                               │
│  Certificate marked INCOMPLETE                │
│        │                                      │
│        ▼                                      │
│  Training Record → PENDING                    │
│  completedAt = null                           │
└──────────────────────────────────────────────┘
```

---

### 8.6 Certificates Module

**Purpose:** Creates, manages, and serves PDF training certificates for staff.

**Certificate Lifecycle:**

```
  PENDING ──▶ COMPLETED (PDF Generated)
     ▲              │
     │              ▼
     └─── INCOMPLETE (PDF Deleted)
```

**Key Features:**
- **Unique Registration Numbers:** Format `LCA-CERT-2026-001` (auto-incremented)
- **PDF Generation:** Uses Puppeteer to render an HTML template with the staff member's name, course, date, and registration number on a branded certificate background
- **Secure Viewing:** Staff can view certificates in-browser using temporary JWT tokens (expire in 60 seconds)
- **Admin-Only Downloads:** Only admins can download certificate PDFs directly
- **Auto-Recovery:** If a certificate file is missing, the system automatically regenerates it

---

### 8.7 VLE Credentials Module

**Purpose:** Stores login credentials for the external Virtual Learning Environment (VLE) at Inspire London College.

**How It Works:**
- Admin assigns a VLE username and password to each staff member
- The password is **encrypted** using AES-256-CBC encryption with a random IV (initialization vector)
- When staff view their VLE credentials, the password is decrypted and shown
- Encryption key comes from environment variables (not hardcoded)

```
┌──────────────────────────────────────────────┐
│          VLE CREDENTIAL ENCRYPTION            │
│                                               │
│  STORING:                                     │
│  Plain password → AES-256-CBC encrypt         │
│  with random IV → "iv_hex:ciphertext_hex"     │
│  → Stored in database                         │
│                                               │
│  RETRIEVING:                                  │
│  "iv_hex:ciphertext_hex" → Extract IV         │
│  → AES-256-CBC decrypt → Plain password       │
│  → Shown to staff/admin                       │
└──────────────────────────────────────────────┘
```

---

### 8.8 Policies Module

**Purpose:** Complete policy management system with reading tracking and analytics.

This is a complex module with several sub-components:

#### Sub-Component 1: Policy CRUD (Create, Read, Update, Delete)
- Admin uploads PDF policy documents
- Each policy has a title, description, version number, and active/inactive status
- When a policy is uploaded or version bumped, notifications are sent to ALL active staff

#### Sub-Component 2: Policy Reading Sessions
- When staff opens a policy, a reading session is started (with timestamp)
- When they close/finish, the session is completed (with duration)
- **Minimum 30 seconds** reading time required for a session to count
- Multiple sessions per policy per day are tracked independently

#### Sub-Component 3: Policy Notifications
- Each staff member gets a notification when a new/updated policy is available
- Badge count shown in sidebar
- Notifications marked as read when the policy reading session completes

#### Sub-Component 4: Policy Analytics & Reports
- Admin can view:
  - Which staff have read which policies
  - How long each person spent reading
  - Compliance rates
  - Aggregated reports

```
┌──────────────────────────────────────────────────────┐
│              POLICIES MODULE STRUCTURE                 │
│                                                        │
│  ┌─────────────┐     ┌──────────────────────┐        │
│  │   Policy     │     │  Policy Notification  │       │
│  │   (the PDF)  │◀───│  (per staff member)   │       │
│  └──────┬──────┘     └──────────────────────┘        │
│         │                                              │
│         ▼                                              │
│  ┌──────────────────────┐                             │
│  │  Reading Session      │                             │
│  │  • staffId            │                             │
│  │  • policyId           │                             │
│  │  • startTime          │                             │
│  │  • endTime            │                             │
│  │  • duration (seconds) │                             │
│  │  • status             │                             │
│  └──────────────────────┘                             │
└──────────────────────────────────────────────────────┘
```

---

### 8.9 References Module

**Purpose:** Manages the entire reference checking process for new staff hires.

There are **two types** of references:

| Type | Form Name | What It Asks |
|---|---|---|
| **Personal** | Character Reference Request Form | Character traits: dignity, honesty, compassion, motivation, caring |
| **Professional** | Reference Request Form | Employment history, duties, attendance, performance, compliance |

**The Full Lifecycle:**

1. **Admin sends reference request** → Email with secure link sent to referee
2. **Referee opens link** → Status changes to OPENED
3. **Referee fills form** → Ratings, comments, signature
4. **Referee submits** → Status changes to SUBMITTED
5. **Admin reviews** → Can download filled PDF

**Auto-Reminders:**
- If a referee hasn't responded in 3+ days, the system can send reminder emails
- Reminders continue until the referee submits
- Can be triggered manually (admin) or automatically (via N8N automation)

---

### 8.10 Notifications Module

**Purpose:** In-app notification system to alert users about events.

**Types of Notifications:**
- "Your certificate for X is ready for download"
- "New policy uploaded — please read"
- General admin announcements

**Features:**
- Stored per user
- Sorted by most recent first
- Max 20 shown at a time
- Can be marked as read (individually or all at once)
- Metadata field for linking to specific resources (e.g., certificate ID)

---

### 8.11 Email Module

**Purpose:** Sends emails using Nodemailer through SMTP or Gmail.

**Emails Sent:**
| Email Type | When It's Sent | Content |
|---|---|---|
| **OTP Email** | Password reset requested | 6-digit code, expires in 15 min |
| **Reference Email** | Reference request created (legacy) | PDF attachment |
| **Reference Link Email** | Reference request with secure link | Button to online form |
| **Reference Reminder** | After 3+ days without response | Reminder with secure link |

---

### 8.12 API Tokens Module

**Purpose:** Allows external systems to authenticate with the backend using API tokens.

**How It Works:**
1. User creates an API token in the Settings page
2. A secure random token is generated (32 bytes → 64 hex characters)
3. The token is **hashed** (SHA-256) before storage — the plain token is shown only once
4. External systems include the token in their requests to authenticate
5. Tokens can have scopes (permissions) and expiration dates

**Use Case:** The N8N automation system uses API tokens to make authenticated requests to the backend.

---

### 8.13 N8N Automation Module

**Purpose:** Provides API endpoints for the N8N workflow automation tool to interact with the system.

**What N8N Can Do:**
| Action | Description |
|---|---|
| Enroll User | Assign a user to a training plan |
| Create Plan | Create a new training plan for a user |
| Get Plans | Retrieve plans for a user |
| Create Reminder | Schedule a reminder for a user |
| Get Pending Reminders | Get reminders that are due |
| Mark Reminder Sent | Mark a reminder as sent |

**Authentication:** Uses API tokens (not JWT) — the request includes a token in the header, which is verified against the hashed tokens in the database.

---

## 9. Database Structure (How Data Is Stored)

The application uses **PostgreSQL** with the following tables:

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATABASE ENTITY RELATIONSHIPS                   │
│                                                                    │
│  ┌──────────┐ 1──1 ┌────────────┐ 1──N ┌────────────────┐       │
│  │  users   │─────▶│staff_      │─────▶│ address_       │       │
│  │          │      │profiles    │      │ history        │       │
│  │ • id     │      │            │      │                │       │
│  │ • email  │      │ • firstName│      │ • line1, line2 │       │
│  │ • pass   │      │ • lastName │      │ • town, post   │       │
│  │ • role   │      │ • phone    │      │ • dateFrom/To  │       │
│  │ • active │      │ • ilccs    │      └────────────────┘       │
│  └──┬──┬────┘      │ • photo   │                                │
│     │  │           └───┬──┬────┘                                │
│     │  │               │  │      1──N ┌────────────────┐        │
│     │  │               │  └──────────▶│ review_forms   │        │
│     │  │               │              │                │        │
│     │  │               │              │ • formType     │        │
│     │  │               │              │ • grades       │        │
│     │  │               │              │ • signatures   │        │
│     │  │               │              └────────────────┘        │
│     │  │               │                                        │
│     │  │               │         1──N ┌────────────────┐        │
│     │  │               └─────────────▶│ references     │        │
│     │  │                              │                │        │
│     │  │                              │ • type         │        │
│     │  │                              │ • email        │        │
│     │  │                              │ • token        │        │
│     │  │                              │ • status       │        │
│     │  │                              │ • submission   │        │
│     │  │                              └────────────────┘        │
│     │  │                                                        │
│     │  │  1──N ┌────────────────┐                               │
│     │  └──────▶│ certificates   │                               │
│     │          │                │                               │
│     │          │ • courseName   │                               │
│     │          │ • status       │                               │
│     │          │ • regNo        │                               │
│     │          │ • filePath     │                               │
│     │          └────────────────┘                               │
│     │                                                           │
│     │  1──N ┌────────────────┐                                  │
│     ├──────▶│training_records│                                  │
│     │       │                │                                  │
│     │       │ • courseName   │                                  │
│     │       │ • status       │                                  │
│     │       │ • enrollment   │                                  │
│     │       │ • completedAt  │                                  │
│     │       └────────────────┘                                  │
│     │                                                           │
│     │  1──1 ┌────────────────┐                                  │
│     ├──────▶│vle_credentials │                                  │
│     │       │                │                                  │
│     │       │ • username     │                                  │
│     │       │ • password     │                                  │
│     │       │   (encrypted)  │                                  │
│     │       └────────────────┘                                  │
│     │                                                           │
│     │  1──N ┌────────────────┐                                  │
│     ├──────▶│ notifications  │                                  │
│     │       │                │                                  │
│     │       │ • title        │                                  │
│     │       │ • message      │                                  │
│     │       │ • isRead       │                                  │
│     │       └────────────────┘                                  │
│     │                                                           │
│     │  1──N ┌────────────────┐                                  │
│     ├──────▶│ api_tokens     │                                  │
│     │       │                │                                  │
│     │       │ • name         │                                  │
│     │       │ • tokenHash    │                                  │
│     │       │ • scopes       │                                  │
│     │       └────────────────┘                                  │
│     │                                                           │
│     │  1──N ┌────────────────┐     1──N ┌──────────────────┐   │
│     ├──────▶│ plans          │    ┌────▶│ policy_reading_  │   │
│     │       └────────────────┘    │     │ sessions         │   │
│     │                             │     └──────────────────┘   │
│     │  1──N ┌────────────────┐    │                             │
│     └──────▶│ reminders      │    │     ┌──────────────────┐   │
│             └────────────────┘    │     │ policy_          │   │
│                                   ├────▶│ notifications    │   │
│         ┌────────────────┐        │     └──────────────────┘   │
│         │   policies     │────────┘                             │
│         │                │                                      │
│         │ • title        │                                      │
│         │ • filePath     │                                      │
│         │ • version      │                                      │
│         │ • isActive     │                                      │
│         └────────────────┘                                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Security Features

The application implements multiple layers of security:

### Authentication & Authorization
| Feature | How It Works |
|---|---|
| **Password Hashing** | Bcrypt with 12 salt rounds — passwords can never be reversed |
| **JWT Tokens** | Stateless auth tokens with expiry — sent in every request |
| **Role-Based Access (RBAC)** | Each endpoint checks if user is Admin or Staff |
| **Ownership Checks** | Staff can only access their own data |

### Input Validation & Protection
| Feature | How It Works |
|---|---|
| **Validation Pipe** | All inputs validated against DTOs (data transfer objects) |
| **Whitelist Mode** | Unknown fields automatically stripped from requests |
| **Rate Limiting** | 100 requests/minute globally; 5/15min on auth endpoints |
| **Helmet** | Security HTTP headers (CSP, HSTS, etc.) |
| **CORS** | Only allows requests from configured frontend URL |
| **Body Size Limit** | Max 10MB request body |

### Data Protection
| Feature | How It Works |
|---|---|
| **VLE Encryption** | AES-256-CBC with random IV for VLE passwords |
| **API Token Hashing** | SHA-256 hash — plain token shown only once |
| **OTP Hashing** | OTPs hashed with bcrypt before storage |
| **OTP Invalidation** | Cleared immediately after use |
| **XSS Prevention** | HTML escaping in generated PDFs |
| **Path Traversal Prevention** | Filename sanitization for file serving |
| **Header Injection Prevention** | Filenames sanitized in Content-Disposition |

### Anti-Abuse
| Feature | How It Works |
|---|---|
| **User Enumeration Prevention** | Same message whether email exists or not |
| **Brute Force Protection** | Throttling on login, OTP, and registration |
| **File Upload Validation** | Only image types allowed for profile pictures |
| **Session Control** | Only one active policy reading session per staff |

---

## 11. File & Folder Structure

```
cpdgroup/
│
├── src/                          ← FRONTEND CODE
│   ├── main.tsx                  ← Entry point (routes, layout)
│   ├── theme.ts                  ← Mantine theme configuration
│   ├── components/               ← All UI components
│   │   ├── LandingPage.tsx       ← Public landing page
│   │   ├── LoginPage.tsx         ← Login form
│   │   ├── SignupPage.tsx        ← Registration form
│   │   ├── ForgotPasswordPage.tsx← Password reset flow
│   │   ├── DashboardView.tsx     ← Admin dashboard
│   │   ├── StaffProfilePage.tsx  ← Staff profile (tabs)
│   │   ├── StaffList.tsx         ← Staff list on dashboard
│   │   ├── CoursesPage.tsx       ← Course catalog
│   │   ├── PoliciesPage.tsx      ← Policy reading (staff)
│   │   ├── PoliciesManagePage.tsx← Policy CRUD (admin)
│   │   ├── PolicyReportsPage.tsx ← Policy reports (admin)
│   │   ├── PolicyAnalytics.tsx   ← Policy analytics (admin)
│   │   ├── PolicyTable.tsx       ← Reusable policy table
│   │   ├── ReferenceSubmissionPage.tsx ← Public form for referees
│   │   ├── ReferenceAnalyticsPage.tsx  ← Reference dashboard (admin)
│   │   ├── SettingsPage.tsx      ← User settings
│   │   ├── ApiTokensPage.tsx     ← API token management
│   │   ├── Header.tsx            ← Top navigation bar
│   │   ├── Sidebar.tsx           ← Side navigation menu
│   │   ├── PageWrapper.tsx       ← Layout wrapper
│   │   ├── ProtectedRoute.tsx    ← Auth guard for routes
│   │   ├── SignaturePad.tsx      ← Digital signature component
│   │   └── profile/              ← Profile tab components
│   │       ├── PersonalDetailsTab.tsx
│   │       ├── PersonalInformationTab.tsx
│   │       ├── IdentityAddressTab.tsx
│   │       └── ReferencesTab.tsx
│   ├── contexts/
│   │   └── SidebarContext.tsx     ← Sidebar collapse state
│   ├── utils/
│   │   └── auth.ts               ← Token checking utilities
│   └── data/
│       ├── mandatoryCourses.ts   ← Course catalog data
│       └── policies.ts           ← Policy helper data
│
├── backend/                      ← BACKEND CODE
│   └── src/
│       ├── main.ts               ← Server entry point
│       ├── app.module.ts         ← Root module (imports all modules)
│       ├── app.controller.ts     ← Health check endpoint
│       ├── app.service.ts        ← Health check service
│       │
│       ├── auth/                 ← Authentication module
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.dto.ts
│       │   ├── jwt.strategy.ts
│       │   ├── roles.decorator.ts
│       │   └── roles.guard.ts
│       │
│       ├── users/                ← Users module
│       │   ├── users.module.ts
│       │   ├── users.service.ts
│       │   └── user.entity.ts
│       │
│       ├── staff/                ← Staff management module
│       │   ├── staff.module.ts
│       │   ├── staff.controller.ts
│       │   ├── staff.service.ts
│       │   ├── dashboard.controller.ts
│       │   ├── staff-profile.entity.ts
│       │   ├── address-history.entity.ts
│       │   ├── review-form.entity.ts
│       │   └── dto/
│       │       ├── update-staff.dto.ts
│       │       ├── create-review-form.dto.ts
│       │       └── create-address.dto.ts
│       │
│       ├── courses/              ← Course catalog module
│       │   ├── courses.module.ts
│       │   ├── courses.controller.ts
│       │   ├── courses.service.ts
│       │   ├── course.entity.ts
│       │   └── dto/
│       │       └── create-course.dto.ts
│       │
│       ├── training/             ← Training records module
│       │   ├── training.module.ts
│       │   ├── training.controller.ts
│       │   ├── training.service.ts
│       │   └── training-record.entity.ts
│       │
│       ├── certificates/         ← Certificate generation module
│       │   ├── certificates.module.ts
│       │   ├── certificates.controller.ts
│       │   ├── certificates.service.ts
│       │   └── certificate.entity.ts
│       │
│       ├── vle-credentials/      ← VLE credentials module
│       │   ├── vle-credentials.module.ts
│       │   ├── vle-credentials.controller.ts
│       │   ├── vle-credentials.service.ts
│       │   └── vle-credential.entity.ts
│       │
│       ├── policies/             ← Policy management module
│       │   ├── policies.module.ts
│       │   ├── policies.controller.ts
│       │   ├── policies.service.ts
│       │   ├── policies-crud.controller.ts
│       │   ├── policies-crud.service.ts
│       │   ├── policy-analytics.controller.ts
│       │   ├── policy-analytics.service.ts
│       │   ├── policy-sessions.controller.ts
│       │   ├── policy-notifications.controller.ts
│       │   ├── policy-notifications.service.ts
│       │   ├── policy-report.service.ts
│       │   ├── policy.entity.ts
│       │   ├── policy-reading-session.entity.ts
│       │   ├── policy-notification.entity.ts
│       │   └── dto/
│       │       ├── create-policy.dto.ts
│       │       └── update-policy.dto.ts
│       │
│       ├── references/           ← Reference management module
│       │   ├── references.module.ts
│       │   ├── references.controller.ts
│       │   ├── references.service.ts
│       │   ├── references-scheduler.service.ts
│       │   └── reference.entity.ts
│       │
│       ├── notifications/        ← Notification system module
│       │   ├── notifications.module.ts
│       │   ├── notifications.controller.ts
│       │   ├── notifications.service.ts
│       │   └── notification.entity.ts
│       │
│       ├── email/                ← Email sending module
│       │   ├── email.module.ts
│       │   └── email.service.ts
│       │
│       ├── api-tokens/           ← API token module
│       │   ├── api-tokens.module.ts
│       │   ├── api-tokens.controller.ts
│       │   ├── api-tokens.service.ts
│       │   ├── api-token.entity.ts
│       │   ├── api-token.guard.ts
│       │   └── dto/
│       │
│       ├── n8n-automation/       ← N8N integration module
│       │   ├── n8n-automation.module.ts
│       │   ├── n8n-automation.controller.ts
│       │   ├── n8n-automation.service.ts
│       │   ├── scopes.decorator.ts
│       │   ├── scopes.guard.ts
│       │   └── dto/
│       │
│       ├── plans/                ← Training plans (used by N8N)
│       │   └── plan.entity.ts
│       │
│       ├── reminders/            ← Reminders (used by N8N)
│       │   └── reminder.entity.ts
│       │
│       └── templates/            ← HTML/PDF templates
│           ├── certificate.html
│           └── bg-base64.txt
│
├── package.json                  ← Frontend dependencies
├── vite.config.ts                ← Frontend build configuration
├── tsconfig.json                 ← TypeScript configuration
└── index.html                    ← Entry HTML file
```

---

## 12. How to Run the Application

### Prerequisites
- **Node.js** (v18 or later)
- **PostgreSQL** database
- **npm** package manager

### Correct Environment Keys (from current codebase)

Use a `backend/.env` file.  
Below are the **actual key names used in code**. Replace values with your real environment values.

> Important: never store real production credentials in documentation or git.

```env
# -----------------------------
# Core Server
# -----------------------------
PORT=3000
NODE_ENV=development

# -----------------------------
# Database (TypeORM -> app.module.ts)
# -----------------------------
DB_HOST=YOUR_DB_HOST
DB_PORT=5432
DB_USERNAME=YOUR_DB_USERNAME
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=YOUR_DB_NAME

# -----------------------------
# Authentication (AuthModule/JWT)
# -----------------------------
JWT_SECRET=YOUR_STRONG_RANDOM_JWT_SECRET
JWT_EXPIRES_IN=1d

# -----------------------------
# Frontend / CORS / Public Links
# (used in main.ts and references.service.ts)
# -----------------------------
FRONTEND_URL=http://localhost:5173
APP_BASE_URL=http://localhost:5173
APP_URL=http://localhost:5173

# -----------------------------
# Email (email.service.ts)
# Use either SMTP_* OR EMAIL_USER/EMAIL_PASS (Gmail fallback)
# -----------------------------
EMAIL_USER=YOUR_EMAIL_USERNAME
EMAIL_PASS=YOUR_EMAIL_PASSWORD_OR_APP_PASSWORD

SMTP_HOST=YOUR_SMTP_HOST
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_SMTP_USERNAME
SMTP_PASS=YOUR_SMTP_PASSWORD

# -----------------------------
# VLE encryption (vle-credentials.service.ts)
# REQUIRED in current implementation
# -----------------------------
VLE_ENCRYPTION_KEY=YOUR_VLE_ENCRYPTION_KEY
VLE_ENCRYPTION_SALT=YOUR_VLE_ENCRYPTION_SALT
```

### Notes About "wrong credentials" in docs
- Documentation should only show **key names**, not real credentials.
- If your deployment has different values, keep the same key names and update values in `backend/.env` only.
- `DB_PORT` should be numeric (example: `5432`).
- `FRONTEND_URL` can be comma-separated for multiple origins (as supported by `main.ts`).

### Starting the Application

**Frontend (Development):**
```bash
cd cpdgroup
npm install
npm run dev
# Opens at http://localhost:5173
```

**Backend (Development):**
```bash
cd cpdgroup/backend
npm install
npm run start:dev
# Runs at http://localhost:3000
```

**Production:**
```bash
# Build frontend
cd cpdgroup && npm run build

# Build backend
cd backend && npm run build

# Start backend
npm run start:prod
```

## 13. Glossary (Key Terms Explained)

| Term | Plain English Explanation |
|---|---|
| **API** | Application Programming Interface — the "language" the frontend and backend use to talk to each other |
| **JWT (JSON Web Token)** | A digital "pass" or "key" given to you after login that proves who you are |
| **Bcrypt** | A method to scramble passwords so even if stolen, they can't be read |
| **AES-256-CBC** | A very strong encryption method (like a digital safe) used for VLE passwords |
| **OTP** | One-Time Password — a temporary code sent to your email for password reset |
| **CRUD** | Create, Read, Update, Delete — the four basic operations on data |
| **DTO** | Data Transfer Object — a strict template that defines what data is expected |
| **RBAC** | Role-Based Access Control — different permissions for different user types |
| **TypeORM** | A tool that lets code talk to the database without writing raw SQL |
| **Puppeteer** | A tool that opens a hidden browser to convert HTML into PDF files |
| **Rate Limiting** | Limiting how many requests a user can make in a time period (prevents attacks) |
| **CORS** | Cross-Origin Resource Sharing — security rule about which websites can talk to the backend |
| **Helmet** | Security middleware that adds protective HTTP headers |
| **UUID** | Universally Unique Identifier — a random ID like `a1b2c3d4-e5f6-...` |
| **Entity** | A database table definition in code |
| **Repository** | A code object that handles database queries for a specific entity |
| **Module** | A self-contained unit of code that handles one feature area |
| **Controller** | The code that receives HTTP requests and returns responses |
| **Service** | The code that contains the actual business logic |
| **Guard** | Code that runs before a request reaches the controller (checks permissions) |
| **Middleware** | Code that runs on every request before it reaches your application |
| **VLE** | Virtual Learning Environment — an online learning portal |
| **ILCCS Number** | Inspire London College Certificate Serial — a student registration number |
| **LCA Number** | Lets Care All internal staff number |
| **CPD** | Continuing Professional Development — ongoing professional training |
| **N8N** | An automation tool that can trigger actions on a schedule |
| **Throttle** | To slow down or limit the rate of something |
| **XSS** | Cross-Site Scripting — a type of security attack where malicious code is injected |
| **Path Traversal** | A security attack where someone tries to access files they shouldn't |

---

## 14. Complete Code File Index (Every Code File)

This section lists each code file and what it does.

### Frontend (`src/`)
- `src/main.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/theme.ts` — Frontend UI theme configuration.
- `src/components/ApiTokensPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/CoursesPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/DashboardView.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/ForgotPasswordPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/Header.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/LandingPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/LoginPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/PageWrapper.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/PoliciesManagePage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/PoliciesPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/PolicyAnalytics.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/PolicyReportsPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/PolicyTable.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/ProtectedRoute.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/ReferenceAnalyticsPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/ReferenceSubmissionPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/SettingsPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/Sidebar.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/SignaturePad.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/SignupPage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/StaffList.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/StaffProfilePage.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/profile/IdentityAddressTab.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/profile/PersonalDetailsTab.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/profile/PersonalInformationTab.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/components/profile/ReferencesTab.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/contexts/SidebarContext.tsx` — Frontend React UI component/page with rendering and user interactions.
- `src/data/mandatoryCourses.ts` — Static frontend data used by pages/components.
- `src/data/policies.ts` — Static frontend data used by pages/components.
- `src/utils/auth.ts` — Frontend utility helpers (auth/token handling).

### Backend (`backend/src/`)
- `backend/src/app.controller.spec.ts` — Contains automated test specifications.
- `backend/src/app.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/app.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/app.service.ts` — Implements business logic and database operations.
- `backend/src/main.ts` — Backend entry point: app bootstrap, security middleware, CORS, and validation.
- `backend/src/api-tokens/api-token.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/api-tokens/api-token.guard.ts` — Enforces authentication/authorization checks before route execution.
- `backend/src/api-tokens/api-tokens.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/api-tokens/api-tokens.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/api-tokens/api-tokens.service.ts` — Implements business logic and database operations.
- `backend/src/api-tokens/dto/create-api-token.dto.ts` — Defines request body schema and validation rules.
- `backend/src/auth/auth.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/auth/auth.dto.ts` — Defines request body schema and validation rules.
- `backend/src/auth/auth.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/auth/auth.service.ts` — Implements business logic and database operations.
- `backend/src/auth/jwt.strategy.ts` — Defines authentication token validation strategy (JWT).
- `backend/src/auth/roles.decorator.ts` — Provides custom decorators used by guards/controllers.
- `backend/src/auth/roles.guard.ts` — Enforces authentication/authorization checks before route execution.
- `backend/src/certificates/certificate.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/certificates/certificates.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/certificates/certificates.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/certificates/certificates.service.ts` — Implements business logic and database operations.
- `backend/src/courses/course.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/courses/courses.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/courses/courses.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/courses/courses.service.ts` — Implements business logic and database operations.
- `backend/src/courses/dto/create-course.dto.ts` — Defines request body schema and validation rules.
- `backend/src/email/email.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/email/email.service.ts` — Implements business logic and database operations.
- `backend/src/n8n-automation/dto/create-plan.dto.ts` — Defines request body schema and validation rules.
- `backend/src/n8n-automation/dto/create-reminder.dto.ts` — Defines request body schema and validation rules.
- `backend/src/n8n-automation/dto/enroll-user.dto.ts` — Defines request body schema and validation rules.
- `backend/src/n8n-automation/n8n-automation.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/n8n-automation/n8n-automation.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/n8n-automation/n8n-automation.service.ts` — Implements business logic and database operations.
- `backend/src/n8n-automation/scopes.decorator.ts` — Provides custom decorators used by guards/controllers.
- `backend/src/n8n-automation/scopes.guard.ts` — Enforces authentication/authorization checks before route execution.
- `backend/src/notifications/notification.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/notifications/notifications.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/notifications/notifications.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/notifications/notifications.service.ts` — Implements business logic and database operations.
- `backend/src/plans/plan.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/policies/dto/create-policy.dto.ts` — Defines request body schema and validation rules.
- `backend/src/policies/dto/finish-policy-reading.dto.ts` — Defines request body schema and validation rules.
- `backend/src/policies/dto/start-policy-reading.dto.ts` — Defines request body schema and validation rules.
- `backend/src/policies/dto/update-policy-session.dto.ts` — Defines request body schema and validation rules.
- `backend/src/policies/dto/update-policy.dto.ts` — Defines request body schema and validation rules.
- `backend/src/policies/policies-crud.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/policies/policies-crud.service.ts` — Implements business logic and database operations.
- `backend/src/policies/policies.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/policies/policies.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/policies/policies.service.ts` — Implements business logic and database operations.
- `backend/src/policies/policy-analytics.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/policies/policy-analytics.service.ts` — Implements business logic and database operations.
- `backend/src/policies/policy-notification.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/policies/policy-notifications.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/policies/policy-notifications.service.ts` — Implements business logic and database operations.
- `backend/src/policies/policy-reading-session.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/policies/policy-report.service.ts` — Implements business logic and database operations.
- `backend/src/policies/policy-sessions.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/policies/policy.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/references/reference.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/references/references-scheduler.service.ts` — Implements business logic and database operations.
- `backend/src/references/references.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/references/references.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/references/references.service.ts` — Implements business logic and database operations.
- `backend/src/reminders/reminder.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/scripts/check-logins.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/check-login.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/check-schema.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/check-users-schema.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/check-users.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/create-temp-admin.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/debug-check.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/debug-users.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/delete-user.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/extract-docx.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/fix-active.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/fix-logins.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/inject-certificate-bg.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/manage-users.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/migrate-vle-keys.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/process-reference-reminders.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/seed-courses.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/seed.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/show-users.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/test-api.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/test-query.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/test-reg.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/verify-admin-access.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/verify-backfill.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/scripts/verify-sync.ts` — Utility/maintenance script for debugging, migration, seeding, or data fixes.
- `backend/src/staff/address-history.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/staff/dashboard.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/staff/dto/create-address.dto.ts` — Defines request body schema and validation rules.
- `backend/src/staff/dto/create-review-form.dto.ts` — Defines request body schema and validation rules.
- `backend/src/staff/dto/update-staff.dto.ts` — Defines request body schema and validation rules.
- `backend/src/staff/review-form.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/staff/staff-profile.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/staff/staff.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/staff/staff.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/staff/staff.service.ts` — Implements business logic and database operations.
- `backend/src/training/training-record.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/training/training.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/training/training.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/training/training.service.ts` — Implements business logic and database operations.
- `backend/src/users/user.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/users/users.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/users/users.service.ts` — Implements business logic and database operations.
- `backend/src/vle-credentials/vle-credential.entity.ts` — Defines database table/entity structure and relations.
- `backend/src/vle-credentials/vle-credentials.controller.ts` — Defines HTTP API routes and request/response handling.
- `backend/src/vle-credentials/vle-credentials.module.ts` — Wires related controllers/services/entities into a NestJS module.
- `backend/src/vle-credentials/vle-credentials.service.ts` — Implements business logic and database operations.

---

## Summary

This CPD Platform is a comprehensive staff management system that handles the entire lifecycle of a care worker's professional development — from registration and onboarding, through training and certification, to policy compliance and reference checking. It provides admins with powerful tools for oversight and reporting, while giving staff a simple interface to manage their professional journey.

The system is built with **security-first principles**, including encrypted credentials, hashed passwords, rate limiting, role-based access control, and input validation at every level. All sensitive operations are logged, and the architecture follows industry best practices for a NestJS + React application.

---

*© 2026 Lets Care All Ltd. Documentation prepared for internal use.*
