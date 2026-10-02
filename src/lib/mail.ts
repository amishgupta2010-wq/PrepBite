import nodemailer from 'nodemailer';

/**
 * Sends an email using the configured GMAIL_USER and GMAIL_APP_PASSWORD.
 * 
 * @param to - recipient email
 * @param subject - email subject
 * @param html - email body in HTML
 * @returns boolean indicating success or failure (errors are logged internally)
 */
export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  try {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.error('Email configuration missing: GMAIL_USER or GMAIL_APP_PASSWORD is not set.');
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });

    const mailOptions = {
      from: user,
      to,
      subject,
      html,
      text: text || '',
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
