# Connect 10ms (কানেক্ট ১০এমএস)
### 10 Minute School Student Support, Helpdesk & Issue Management Platform

A centralized, mobile-responsive, role-based support platform designed for verified **10 Minute School (10MS)** students across programs such as **HSC 27** and **HSC 28**. Built with React, Tailwind CSS, Lucide Icons, Node.js/Express, SQLite/JSON persistence, and direct integration with 10MS live class & exam catalogs (780+ records from Google Sheets).

---

## 🌟 Key Features Implemented

### 1. Pre-Approved Eligibility & Secure Registration
- **Pre-Approved Roster Verification**: Admin manages the entitlement roster with approved **TMS Transaction IDs**, normalized login phones, and assigned programs.
- **2-Step Registration Wizard**:
  - **Step 1 (Eligibility Verification)**: Checks server-side that the TMS ID + Phone + Program match an approved entitlement and has not been claimed.
  - **Step 2 (Account Setup & Profile)**: Collects student name, department (Science / Business Studies / Humanities), password, college, district, email, and contact info.
- **Claim Lock**: Once claimed, the entitlement is locked to that student account.
- **Subsequent Logins**: Signs in directly with phone + password without repeating onboarding.

### 2. Department-Aware Student Learning Views & Dashboard
- **Signature 10MS Branding**: Deep maroon (`#DA291C`), white cards, and green action accents.
- **Bilingual Interface**: Full toggle between **Bangla (বাংলা)** and **English**.
- **Department Curriculum Filtering**:
  - **Science**: Bangla, English, ICT, Physics, Chemistry, Biology, Higher Math.
  - **Business Studies**: Bangla, English, ICT, Finance, Accounting, Marketing, Management.
  - **Humanities**: Bangla, English, ICT, Economics, Geography, Civics.
- **Upcoming Classes Schedule**: Dynamically filtered by the student's enrolled department using real schedule data extracted from the 10MS Google Sheet (Column G titles, chapters, dates, and recorded class links).
- **Notice Board**: High-visibility announcements categorized by urgency (**Urgent**, **High**, **Normal**), targeted by batch and department.

### 3. Dynamic Issue Reporting Form (With Exact Bengali Specifications)
A progressive 5-step dynamic form where answers conditionally reveal next steps:
- **Step 1**: Category selection:
  - 🔴 **Class Issue**
  - 📝 **Exam Issue**
  - 📱 **App & Website Issue**
  - 💬 **Others**
- **Step 2**: Program selection (**HSC 28**, **HSC 27**).
- **Step 3**: Department context + Subject selection (**All subjects available for reporting** per PRD).
- **Step 4 Conditional Flows**:
  - **Class Flow**:
    - Select Class Type: **Live Class** / **Recorded Class** / **Archive** / **Others**.
    - If Live Class: Input **Class Date (কবের ক্লাস)** + select session title from the **Google Sheet Column G catalog** or enter custom topic.
    - Problem type (Audio/Video sync issue, stream freeze, missing slide, etc.).
  - **Exam Flow**:
    - Select Exam Type: **Daily Exam (ডেইলি এক্সাম)** / **Monthly Exam (মান্থলি এক্সাম)** / **CQ Exam (সিকিউ এক্সাম)** / **Others (অন্যান্য - নিজের মতো লিখবে)**.
    - Exam Date picker with **"তারিখ জানা নেই / N/A"** button (sets date to `N/A` if unknown).
    - If **Daily Exam**: Select exam title from the **Google Sheet Column G list** alongside its scheduled date (`[Date] - [Exam Title]`).
    - Problem type (wrong marks calculation, auto zero score on submit, option error, CQ script upload error).
  - **App & Website Flow**: Platform (Android, iOS, Web Desktop, Web Mobile), version, device model, stream 403 error, login/OTP issue.
  - **Others Flow**: Subtype, lecture sheet link, routine confusion.
- **Step 5**: Title, detailed description, **file attachment upload** (with size & format check), review summary, and submit!

### 4. Captain Dashboard & Escalation Workflows
- **Staff-Assigned Captains**: Designated by admins with assigned program & scope.
- **Submit on Behalf of Students**:
  - Affected Scope: **Self** / **Specific Student** / **Both** / **Multiple Students (Cohort)**.
  - When **Specific Student** is selected: Enter login phone number and click **Verify Student** (`/api/captain/verify-student`) to verify name & college without exposing private data.
- **Captain Escalation**: Captain can review tickets and click **"এসকেলেট করুন (Escalate)"** to elevate priority to **Urgent** with audit-logged justification.

### 5. Admin & Support Staff Issue Desk
- **Dedicated Staff Portal**: Separate authentication path (`STAFF-1001` or staff email) completely independent from student logins.
- **Drive-Style Category Folders**: Prominent cards for **Class**, **Exam**, **App/Website**, and **Others** with ticket counts and urgent badge counters.
- **Priority Queues**:
  - 🔥 **Important Queue** (Urgent / High priority tickets)
  - 📋 **Normal Queue**
- **Product Switcher**: Switch views across **All Programs**, **HSC 28**, and **HSC 27**.
- **High-Density Table View vs Card View Toggle**.
- **Ticket Detail Drawer**:
  - Metadata, category breakdown, affected student details, attachments preview.
  - Conversation thread: Student messages, staff replies, captain notes.
  - **Internal Staff Notes** (flagged internal with lock icon, strictly hidden from students).
  - Change status (Open ➔ In Progress ➔ Waiting for Student ➔ Resolved ➔ Closed).
  - Change priority (Normal ➔ High ➔ Urgent).
  - Resolve ticket with custom resolution message (automatically fires student notification).
  - Export filtered tickets to CSV.
- **Management Hub Tabs**:
  - 📋 **Eligibility Roster**: Search by TMS ID/phone, view claimed vs unclaimed, add single record, bulk import CSV.
  - 🎖️ **Captain Management**: List active captains, promote students, revoke captain role.
  - 📢 **Notice Board Manager**: Publish announcements with program/department targeting and expiry dates.
  - 📜 **Audit Trail**: Real-time event log of all ticket state changes, roster operations, and replies.

---

## ⚡ Quick Demo Accounts (1-Click Fill in Login Screen)

The login screen includes quick buttons to fill any of these demo credentials:

| Role | Login Identifier | Password | Details |
|---|---|---|---|
| **Science Student** | `01811000002` | `student123` | HSC 28 Science (Sadia Islam) |
| **Business Studies** | `01911000003` | `student123` | HSC 28 Business (Fahim Ahsan) |
| **Humanities Student** | `01611000004` | `student123` | HSC 27 Humanities (Nusrat Jahan) |
| **Batch Captain** | `01711000001` | `captain123` | HSC 28 Captain (Rahat Chowdhury) |
| **Support Staff** | `STAFF-1002` | `admin123` | Anika Rahman (Issue Desk Specialist) |
| **Lead Admin** | `STAFF-1001` | `admin123` | Tanvir Hossain (Lead Operations) |

### 🧪 Pre-Approved Unclaimed TMS IDs to Test New Registration
Use any of these on the **Register (টিএমএস আইডি দিয়ে)** tab:
- **TMS ID**: `TMS-2026-90001` | **Phone**: `01700112233` | **Program**: `HSC 28`
- **TMS ID**: `TMS-2026-90004` | **Phone**: `01500445566` | **Program**: `HSC 27`

---

## 🚀 How to Run

### Option 1: Full-Stack Production Mode (Single Port 5000)
```bash
# Build the frontend bundle
npm run build

# Start the Connect 10ms server
npm start
```
Open **`http://localhost:5000`** in your browser.

### Option 2: Live Development Mode
```bash
# Start backend server
node server/server.js

# In another terminal, start Vite dev server
npm run dev
```
Open **`http://localhost:5173`** (Vite proxies all `/api` calls to port 5000).

### Run Automated End-to-End Test Suite
```bash
python test_suite.py
```
Validates all 9 end-to-end suites: SPA delivery, catalog parsing, roster entitlement check, registration wizard, student login, department filtering, issue reporting with Bengali rules, captain workflows, and server-side RBAC security.

---

## 📁 Project Architecture

```
Connect 10ms/
├── data/
│   └── database.json          # Persistent ACID JSON database
├── server/
│   ├── catalog.json           # 782 classes & exams parsed from 10MS Google Sheet
│   ├── db.js                  # Database layer with index lookups & atomic persistence
│   ├── seed.js                # Seed data with roster, users, tickets, and notices
│   └── server.js              # RESTful API, authentication, RBAC, file uploads
├── src/
│   ├── components/
│   │   ├── AuthModal.jsx             # Student & separate Staff login, 2-step registration
│   │   ├── CaptainDesk.jsx           # Captain workflow, phone verification, escalation
│   │   ├── DynamicIssueForm.jsx      # 5-step dynamic issue form (Bengali rules & Column G)
│   │   ├── Header.jsx                # Top bar, 10MS logo, role badges, notifications bell
│   │   ├── NotificationsModal.jsx    # Real-time alert center
│   │   ├── ProfileModal.jsx          # Editable profile & locked institutional identity
│   │   ├── StaffDesk.jsx             # Category folders, queues, high-density table, roster
│   │   ├── StudentDashboard.jsx      # Metrics, notice board, department-filtered classes
│   │   └── TicketDetailModal.jsx     # Messages timeline, internal staff notes, status
│   ├── api.js                 # API client with JWT handling
│   ├── translations.js        # Bilingual Bengali/English mappings
│   ├── index.css              # Tailwind styling & animations
│   ├── App.jsx                # App orchestrator
│   └── main.jsx               # React entry point
├── uploads/                   # Uploaded ticket screenshots & documents
├── package.json
├── vite.config.js
├── test_suite.py              # Automated 9-suite verification runner
└── README.md
```
