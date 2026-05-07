import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || "noreply@localhost";

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
  const from = process.env.EMAIL_FROM || "noreply@localhost";

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
  const from = process.env.EMAIL_FROM || "noreply@localhost";

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

export async function sendStudentRegistrationEmail(params: {
  to: string;
  name: string;
  applicationId: string;
  universityName: string;
  courseName: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || "noreply@localhost";

  const subject = "Application submitted";
  const text = `Hello ${params.name},

Your application has been submitted.

Application ID: ${params.applicationId}
University: ${params.universityName}
Course: ${params.courseName}

Thanks,
University Portal`;

  const html = `<p>Hello <strong>${escapeHtml(params.name)}</strong>,</p>
<p>Your application has been submitted.</p>
<ul>
<li><strong>Application ID:</strong> ${escapeHtml(params.applicationId)}</li>
<li><strong>University:</strong> ${escapeHtml(params.universityName)}</li>
<li><strong>Course:</strong> ${escapeHtml(params.courseName)}</li>
</ul>
<p>Thanks,<br/>University Portal</p>`;

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
  const from = process.env.EMAIL_FROM || "noreply@localhost";

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
  const from = process.env.EMAIL_FROM || "noreply@localhost";

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

export async function sendCounsellorPortalInviteEmail(params: {
  to: string;
  acceptUrl: string;
  inviterName: string;
  universityLabels: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || "noreply@localhost";

  const subject = "You are invited as a counsellor on University Portal";
  const text = `Hello,

${params.inviterName} has invited you to join as a counsellor on University Portal.

Universities: ${params.universityLabels}

Open this link to accept and set your password (or sign in later with email + OTP):
${params.acceptUrl}

Thanks,
University Portal`;

  const html = `<p><strong>${escapeHtml(params.inviterName)}</strong> has invited you to join as a <strong>counsellor</strong> on University Portal.</p>
<p><strong>Universities:</strong> ${escapeHtml(params.universityLabels)}</p>
<p><a href="${params.acceptUrl}">Accept invitation</a></p>
<p>You can set a password on the acceptance page, or use email + one-time code (OTP) at login.</p>
<p>Thanks,<br/>University Portal</p>`;

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
