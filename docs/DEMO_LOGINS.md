# Demo data & logins (QSP Edu — University Portal)

All accounts use **email + OTP** (no password). After `npm run db:seed` (or `prisma db seed`), use these emails on the login page.

| Role | Email | Notes |
|------|--------|--------|
| **Master Admin** | `master@university.local` | Global `master` role; not tied to one university row. |
| **Admin** | `admin@university.local` | University-scoped `admin` role on **QSP University** (`QSP-U1`). |
| **University** (staff) | `university@university.local` | Admissions-style `university` role for **QSP University**. |
| **Counsellor** | `counsellor@university.local` | `counsellor` role; **QSP University**. |
| **Consultant** | `consultant@university.local` | `consultant` role; **QSP University**. |
| **Student** (managed by counsellor) | `student@university.local`<br>`student2@university.local`<br>`student3@university.local` | `student` role; `studentOfId` → **counsellor** user. |
| **Student** (managed by consultant) | `student4@university.local`<br>`student5@university.local`<br>`student6@university.local` | `student` role; `studentOfId` → **consultant** user. |

## OTP in development

- If SMTP is **not** configured, the server logs the OTP: `[OTP dev] To: … Code: …`
- With `NODE_ENV=development` (and optional `SHOW_OTP_ON_SCREEN`), the API may return the code for on-screen display on the verify step.

## Seeded relationships

- **University ↔ users**: QSP University (`QSP-U1`) is linked to university staff, counsellor, consultant, admin, and all demo students.
- **Counsellor / consultant ↔ students**: `User.studentOfId` points at the managing counsellor or consultant user (see table above).
- **Admission leads**: Sample leads include one **consultant**-coded lead and one **counsellor**-coded lead on QSP University (streams / years vary).

## Re-seed

```bash
cd prisma && npx prisma db seed
```

(From project root, `npm run db:seed` if defined in `package.json` — otherwise use `npx prisma db seed`.)
