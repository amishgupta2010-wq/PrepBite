import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    // Using shared mail helper instead of inline transporter

    let subject = '';
    let text = '';
    let html = '';

    if (type === 'FAQ') {
      subject = `PrepBite FAQ Question from ${payload.name || 'Anonymous'}`;
      text = `Name: ${payload.name || 'Anonymous'}\nEmail: ${payload.email || 'None'}\nQuestion: ${payload.question}`;
      html = `
        <h3>New FAQ Question from PrepBite</h3>
        <p><strong>Name:</strong> ${payload.name || 'Anonymous'}</p>
        <p><strong>Email:</strong> ${payload.email || 'None'}</p>
        <p><strong>Question:</strong> ${payload.question}</p>
      `;
    } else if (type === 'REVIEW') {
      subject = `PrepBite Review: ${payload.stars} Stars from ${payload.name || 'Anonymous'}`;
      text = `Name: ${payload.name || 'Anonymous'}\nEmail: ${payload.email || 'None'}\nStars: ${payload.stars}\nReview: ${payload.review}`;
      html = `
        <h3>New Review for PrepBite</h3>
        <p><strong>Name:</strong> ${payload.name || 'Anonymous'}</p>
        <p><strong>Email:</strong> ${payload.email || 'None'}</p>
        <p><strong>Rating:</strong> ${payload.stars} Stars</p>
        <p><strong>Review:</strong> ${payload.review}</p>
      `;
    } else if (type === 'ONBOARDING_REFERRAL') {
      subject = `New PrepBite Member: ${payload.name}`;
      text = `New Member Registered!\n\nName: ${payload.name}\nEmail: ${payload.email}\nHow did they hear about us: ${payload.referral}`;
      html = `
        <h3>New PrepBite Member</h3>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>How did they hear about us:</strong> ${payload.referral}</p>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    const toEmail = process.env.GMAIL_USER;
    if (toEmail && process.env.GMAIL_APP_PASSWORD) {
      sendMail(toEmail, subject, html, text).catch(emailErr => {
        console.error('Email helper failed:', emailErr);
      });
    }
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
