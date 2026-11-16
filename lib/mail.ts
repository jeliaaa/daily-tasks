import "server-only";
import nodemailer from "nodemailer";

// Plain SMTP. Configure with HC_SMTP_HOST / HC_SMTP_PORT / HC_SMTP_USERNAME / HC_SMTP_PASSWORD.
// Optional: HC_SMTP_FROM (defaults to the username) and HC_SMTP_FROM_NAME.
export async function sendMail(opts: { to: string; subject: string; html: string }) {
  const host = process.env.HC_SMTP_HOST;
  const port = Number(process.env.HC_SMTP_PORT);
  const user = process.env.HC_SMTP_USERNAME;
  const pass = process.env.HC_SMTP_PASSWORD;
  if (!host || !port || !user || !pass) {
    throw new Error("HC_SMTP_HOST, HC_SMTP_PORT, HC_SMTP_USERNAME and HC_SMTP_PASSWORD must be set");
  }
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS, otherwise STARTTLS
    auth: { user, pass },
  });
  const fromAddress = process.env.HC_SMTP_FROM || user;
  await transport.sendMail({
    from: `"${process.env.HC_SMTP_FROM_NAME || "Daily Tasks"}" <${fromAddress}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
