# QSP Edu — University Portal

Next.js app for university staff and students: OTP sign-in, programmes, leads, and applications.

## Quick start

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo logins (OTP)

Sign-in is **email + one-time code** (no password). After `npm run db:seed`, use the emails in **[docs/DEMO_LOGINS.md](./docs/DEMO_LOGINS.md)** — including **Master Admin**, **Counsellor**, **Student** (linked to counsellor or consultant), and other roles.

In development, OTP is logged to the console if SMTP is unset; see `.env.example` for `SHOW_OTP_ON_SCREEN`.

## Stack

- Next.js, Prisma, PostgreSQL, JWT session cookie.

## Learn More

This project uses [Next.js](https://nextjs.org). See the [Next.js documentation](https://nextjs.org/docs).
