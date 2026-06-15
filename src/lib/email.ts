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

/** Master admin creates an admission partner (consultant) account — activation email. */
export async function sendConsultantAccountCreatedEmail(params: {
  to: string;
  name: string;
  email: string;
  activationUrl: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();
  const consultantName = params.name.trim() || params.email;

  const subject = "Welcome to QSpiders Eduversity — activate your consultant account";
  const text = `Hello ${consultantName},

Welcome to QSpiders Eduversity, we're glad to have you on board.

Your consultant account has been created. Activate your account and set your password using the link below:

${params.activationUrl}

Registered email: ${params.email}

After setting your password, sign in at ${getPublicAppOrigin()}/login with your email and the password you choose.

If you did not expect this email, please contact support.

Warm regards,
Team QSpiders Eduversity`;

  const html = `<p>Hello <strong>${escapeHtml(consultantName)}</strong>,</p>
<p>Welcome to <strong>QSpiders Eduversity</strong>, we're glad to have you on board.</p>
<p>Your consultant account has been created. Activate your account and set your password using the link below:</p>
<p><a href="${escapeHtml(params.activationUrl)}">Activate your QSpiders Eduversity account</a></p>
<p><strong>Registered email:</strong> ${escapeHtml(params.email)}</p>
<p>After setting your password, sign in at <a href="${escapeHtml(`${getPublicAppOrigin()}/login`)}">${escapeHtml(`${getPublicAppOrigin()}/login`)}</a> with your email and the password you choose.</p>
<p>If you did not expect this email, please contact support.</p>
<p>Warm regards,<br/>Team QSpiders Eduversity</p>`;

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
  activationUrl: string;
  inviterName: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();
  const counsellorName = params.name.trim() || params.email;

  const subject = "Welcome to QSpiders Eduversity — activate your Consultant SPOC account";
  const text = `Hello ${counsellorName},

Welcome to QSpiders Eduversity, we're glad to have you on board.

${params.inviterName} has invited you to join as a Consultant SPOC on QSpiders Eduversity.

Activate your account and set your password using the link below:

${params.activationUrl}

Registered email: ${params.email}

After setting your password, sign in at ${getPublicAppOrigin()}/login with your email and the password you choose.

Warm regards,
Team QSpiders Eduversity`;

  const html = `<p>Hello <strong>${escapeHtml(counsellorName)}</strong>,</p>
<p>Welcome to <strong>QSpiders Eduversity</strong>, we're glad to have you on board.</p>
<p><strong>${escapeHtml(params.inviterName)}</strong> has invited you to join as a <strong>Consultant SPOC</strong> on QSpiders Eduversity.</p>
<p>Activate your account and set your password using the link below:</p>
<p><a href="${escapeHtml(params.activationUrl)}">Activate your QSpiders Eduversity account</a></p>
<p><strong>Registered email:</strong> ${escapeHtml(params.email)}</p>
<p>After setting your password, sign in at <a href="${escapeHtml(`${getPublicAppOrigin()}/login`)}">${escapeHtml(`${getPublicAppOrigin()}/login`)}</a> with your email and the password you choose.</p>
<p>Warm regards,<br/>Team QSpiders Eduversity</p>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Consultant SPOC invite dev] To: ${params.to}\n${text}`);
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

export type MouSpocNotifyRow = {
  name: string;
  designation: string;
  mobile: string;
  email: string;
};

/** Notify Sheshu sir team of consultant MOU SPOC contacts for a newly created university. */
export async function sendMouSpocDetailsToSheshuTeam(params: {
  universityName: string;
  universityCode: string;
  mouYear: string | null;
  mouTenure: string | null;
  spocs: MouSpocNotifyRow[];
}): Promise<void> {
  const recipients = (process.env.SHESHU_TEAM_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[MOU SPOC notify dev] SHESHU_TEAM_EMAIL unset — would notify:", params);
    }
    return;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolveEmailFrom();

  const spocLines = params.spocs
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} — ${s.designation}\n   Mobile: ${s.mobile}\n   Email: ${s.email}`,
    )
    .join("\n\n");

  const subject = `MOU SPOC details — ${params.universityName}`;
  const text = `New university MOU SPOC details

University: ${params.universityName} (${params.universityCode})
MOU year: ${params.mouYear ?? "—"}
MOU tenure: ${params.mouTenure ?? "—"}

Consultant SPOC contacts:
${spocLines}
`;

  const spocHtml = params.spocs
    .map(
      (s, i) =>
        `<tr><td style="padding:6px 8px;border:1px solid #ddd">${i + 1}</td><td style="padding:6px 8px;border:1px solid #ddd">${escapeHtml(s.name)}</td><td style="padding:6px 8px;border:1px solid #ddd">${escapeHtml(s.designation)}</td><td style="padding:6px 8px;border:1px solid #ddd">${escapeHtml(s.mobile)}</td><td style="padding:6px 8px;border:1px solid #ddd">${escapeHtml(s.email)}</td></tr>`,
    )
    .join("");

  const html = `<p>New university <strong>${escapeHtml(params.universityName)}</strong> (${escapeHtml(params.universityCode)}) MOU SPOC details:</p>
<p><strong>MOU year:</strong> ${escapeHtml(params.mouYear ?? "—")}<br/>
<strong>MOU tenure:</strong> ${escapeHtml(params.mouTenure ?? "—")}</p>
<table style="border-collapse:collapse;font-size:14px"><thead><tr><th style="padding:6px 8px;border:1px solid #ddd">#</th><th style="padding:6px 8px;border:1px solid #ddd">Name</th><th style="padding:6px 8px;border:1px solid #ddd">Designation</th><th style="padding:6px 8px;border:1px solid #ddd">Mobile</th><th style="padding:6px 8px;border:1px solid #ddd">Email</th></tr></thead><tbody>${spocHtml}</tbody></table>`;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[MOU SPOC notify dev] To: ${recipients.join(", ")}\n${text}`);
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
    to: recipients.join(", "),
    subject,
    text,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
