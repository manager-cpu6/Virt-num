import nodemailer from "nodemailer";

const DEFAULT_HOST = "mail.spacemail.com";
const DEFAULT_PORT = 465;

function smtpConfig() {
  const host = (process.env.SPACEMAIL_SMTP_HOST || DEFAULT_HOST).trim();
  const port = Number(process.env.SPACEMAIL_SMTP_PORT || DEFAULT_PORT);
  const user = (process.env.SPACEMAIL_SMTP_USER || "").trim();
  const pass = process.env.SPACEMAIL_SMTP_PASSWORD || "";
  const from = (process.env.SPACEMAIL_FROM || user).trim();

  if (!user) throw new Error("Spacemail SMTP username is missing. Check SPACEMAIL_SMTP_USER.");
  if (!pass) throw new Error("Spacemail SMTP password is missing. Check SPACEMAIL_SMTP_PASSWORD.");
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error("Invalid Spacemail SMTP port. Use 465 for SSL.");
  }

  return {host, port, user, pass, from};
}

export async function sendEmail(to: string, subject: string, html: string) {
  const config = smtpConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  } as any);

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as {code?: unknown}).code || "")
        : "";
    throw new Error(
      code ? `Spacemail SMTP error [${code}]: ${message}` : `Spacemail SMTP error: ${message}`
    );
  }
}

export function emailTemplate(title: string, text: string, url?: string) {
  return `<div style="font-family:Arial;background:#f5f6f8;padding:32px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:20px;padding:30px"><b style="font-size:22px">NUMELIXA</b><h1>${title}</h1><p style="color:#667085;line-height:1.6">${text}</p>${url ? `<a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:13px 18px;border-radius:10px;text-decoration:none">Continue</a>` : ""}</div></div>`;
}
