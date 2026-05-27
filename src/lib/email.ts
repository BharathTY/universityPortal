import nodemailer from "nodemailer";
import { getPublicAppOrigin } from "@/lib/public-app-origin";

/** When SMTP is configured, set EMAIL_FROM to your real domain. */
function resolveEmailFrom(): string {
  const v = process.env.EMAIL_FROM?.trim();
  if (v) return v;
  return "University Portal <noreply@university-portal.local>";
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[OTP dev] To: ${to} Code: ${code}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Your sign-in code",
    text: `Your code is: ${code}`,
    html: `<p>Your code is: <strong>${code}</strong></p>`,
  });
}

export async function sendStudentInviteEmail(
  to: string,
  acceptUrl: string,
  opts?: { partnerName?: string; branchName?: string },
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();

  const partnerLine =
    opts?.partnerName && opts.partnerName.trim().length > 0
      ? `\nAdmission partner: ${opts.partnerName.trim()}`
      : "";
  const branchLine =
    opts?.branchName && opts.branchName.trim().length > 0
      ? `\nBranch: ${opts.branchName.trim()}`
      : "";

  const subject = "Accept your student portal invitation";
  const text = `You've been invited to the Student Portal.${partnerLine}${branchLine}\n\nOpen this link to accept and then sign in with your email (OTP):\n${acceptUrl}\n`;
  const html = `<p>You've been invited to the <strong>Student Portal</strong>.</p>${
    opts?.partnerName ? `<p><strong>Admission partner:</strong> ${escapeHtml(opts.partnerName.trim())}</p>` : ""
  }${opts?.branchName ? `<p><strong>Branch:</strong> ${escapeHtml(opts.branchName.trim())}</p>` : ""}<p><a href="${acceptUrl}">Accept invitation</a></p><p>After accepting, sign in with your email — you'll receive a one-time code (OTP).</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Invite dev] To: ${to}\n${text}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, text, html });
}

/** Account created — includes password for records; sign-in uses OTP on the login page. */
export async function sendAccountCredentialsEmail(params: {
  to: string;
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();

  const subject = "Account Created";
  const text = `Hello ${params.name},

Your account has been created.

Email: ${params.email}
Password: ${params.password}

Please login and update your password. You can also sign in with your email using a one-time code (OTP).

Thanks,
Admin Team`;

  const html = `<p>Hello <strong>${escapeHtml(params.name)}</strong>,</p>
<p>Your account has been created.</p>
<p><strong>Email:</strong> ${escapeHtml(params.email)}<br/>
<strong>Password:</strong> <code>${escapeHtml(params.password)}</code></p>
<p>Please login and update your password. You can also sign in with your email using a <strong>one-time code (OTP)</strong>.</p>
<p>Thanks,<br/>Admin Team</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Credentials dev] To: ${params.to}\n${text}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to: params.to, subject, text, html });
}

/** Master admin creates an admission partner (consultant) account — credentials email. */
export async function sendConsultantAccountCreatedEmail(params: {
  to: string;
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();
  const portalLink = `${getPublicAppOrigin()}/login`;
  const consultantName = params.name.trim() || params.email;

  const subject = "Welcome to Eduversity — your consultant account";
  const text = `Hello ${consultantName},

Welcome to Eduversity, we're glad to have you on board.

Your consultant account has been successfully created. Please find your login details below:

Portal Link: ${portalLink}
Email: ${params.email}
Password: ${params.password}

Please log in and let us know if you encounter any issues, we'll be happy to help.

Warm regards,
Team Eduversity`;

  const html = `<p>Hello <strong>${escapeHtml(consultantName)}</strong>,</p>
<p>Welcome to Eduversity, we're glad to have you on board.</p>
<p>Your consultant account has been successfully created. Please find your login details below:</p>
<p><strong>Portal Link:</strong> <a href="${escapeHtml(portalLink)}">${escapeHtml(portalLink)}</a><br/>
<strong>Email:</strong> ${escapeHtml(params.email)}<br/>
<strong>Password:</strong> <code>${escapeHtml(params.password)}</code></p>
<p>Please log in and let us know if you encounter any issues, we'll be happy to help.</p>
<p>Warm regards,<br/>Team Eduversity</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Consultant account dev] To: ${params.to}\n${text}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to: params.to, subject, text, html });
}

export async function sendStudentRegistrationEmail(params: {
  to: string;
  name: string;
  universityName: string;
  academicBatchName: string;
  degreeName: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();
  const studentName = params.name.trim() || params.to;

  const subject = "Welcome to Qspiders Eduversity – Access Your Account.";
  const text = `Hi ${studentName},

Welcome to Qspiders Eduversity!

Your admission application has been created successfully with ${params.universityName} (${params.academicBatchName}) for ${params.degreeName}.

We're excited to have you on board let's get started on your learning journey!

Warm regards,
Team Eduversity`;

  const html = `<p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
<p>Welcome to <strong>Qspiders Eduversity</strong>! \u{1F389}</p>
<p>Your admission application has been created successfully with <strong>${escapeHtml(params.universityName)}</strong> (<strong>${escapeHtml(params.academicBatchName)}</strong>) for <strong>${escapeHtml(params.degreeName)}</strong>.</p>
<p>We're excited to have you on board let's get started on your learning journey!</p>
<p>Warm regards,<br/>Team Eduversity</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Application dev] To: ${params.to}\n${text}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to: params.to, subject, text, html });
}

export async function sendPaymentSuccessEmail(params: {
  to: string;
  name: string;
  amountLabel: string;
  applicationId: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();

  const subject = "Payment received";
  const text = `Hello ${params.name},

We received your payment of ${params.amountLabel} for application ${params.applicationId}.

Thanks,
University Portal`;

  const html = `<p>Hello <strong>${escapeHtml(params.name)}</strong>,</p>
<p>We received your payment of <strong>${escapeHtml(params.amountLabel)}</strong> for application <code>${escapeHtml(params.applicationId)}</code>.</p>
<p>Thanks,<br/>University Portal</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Payment dev] To: ${params.to}\n${text}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to: params.to, subject, text, html });
}

/** Sent when a partner adds a lead — prospect can be notified (optional funnel step). */
export async function sendAdmissionLeadWelcomeEmail(params: {
  to: string;
  name: string;
  universityName: string;
  partnerLabel: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();

  const subject = "You have been registered as a prospective student";
  const text = `Hello ${params.name},

You have been added as a prospect with ${params.universityName} through ${params.partnerLabel}.

If you did not expect this email, you can ignore it.

Thanks,
University Portal`;

  const html = `<p>Hello <strong>${escapeHtml(params.name)}</strong>,</p>
<p>You have been added as a prospect with <strong>${escapeHtml(params.universityName)}</strong> through <strong>${escapeHtml(params.partnerLabel)}</strong>.</p>
<p>If you did not expect this email, you can ignore it.</p>
<p>Thanks,<br/>University Portal</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Lead welcome dev] To: ${params.to}\n${text}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to: params.to, subject, text, html });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();
  const recipientName = params.name.trim() || params.to;

  const subject = "Reset your password";
  const text = `Hello ${recipientName},

We received a request to reset your password for Eduversity.

Open this link to choose a new password (valid for 1 hour):
${params.resetUrl}

If you did not request this, you can ignore this email.

Thanks,
Team Eduversity`;

  const html = `<p>Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
<p>We received a request to reset your password for <strong>Eduversity</strong>.</p>
<p><a href="${escapeHtml(params.resetUrl)}">Reset your password</a></p>
<p>This link is valid for 1 hour. If you did not request this, you can ignore this email.</p>
<p>Thanks,<br/>Team Eduversity</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Password reset dev] To: ${params.to}\n${text}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to: params.to, subject, text, html });
}

export async function sendCounsellorPortalInviteEmail(params: {
  to: string;
  name: string;
  email: string;
  password: string;
  loginUrl: string;
  inviterName: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();
  const counsellorName = params.name.trim() || params.email;
  const portalLink = params.loginUrl;

  const subject = "Welcome to Eduversity — your counsellor account";
  const text = `Hello ${counsellorName},

Welcome to Eduversity, we're glad to have you on board.

${params.inviterName} has invited you to join as a counsellor for Qspiders Eduversity's University Portal.

Portal Link: ${portalLink}
Email: ${params.email}
Password: ${params.password}

Please log in and let us know if you encounter any issues, we'll be happy to help.

Warm regards,
Team Eduversity`;

  const html = `<p>Hello <strong>${escapeHtml(counsellorName)}</strong>,</p>
<p>Welcome to Eduversity, we're glad to have you on board.</p>
<p><strong>${escapeHtml(params.inviterName)}</strong> has invited you to join as a counsellor for <strong>Qspiders Eduversity's University Portal</strong>.</p>
<p><strong>Portal Link:</strong> <a href="${escapeHtml(portalLink)}">${escapeHtml(portalLink)}</a><br/>
<strong>Email:</strong> ${escapeHtml(params.email)}<br/>
<strong>Password:</strong> <code>${escapeHtml(params.password)}</code></p>
<p>Please log in and let us know if you encounter any issues, we'll be happy to help.</p>
<p>Warm regards,<br/>Team Eduversity</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Counsellor invite dev] To: ${params.to}\n${text}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to: params.to, subject, text, html });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
