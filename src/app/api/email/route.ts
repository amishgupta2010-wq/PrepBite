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
      subject = `New PrepBite Member Onboarding: ${payload.name || payload.email}`;
      text = `New Member Registered!\n\nName: ${payload.name || 'Anonymous'}\nEmail: ${payload.email}\nGender: ${payload.gender || 'Not specified'}\nCurrent Weight: ${payload.currentWeight || 'N/A'}\nIdeal Weight: ${payload.idealWeight || 'N/A'}\nHeight: ${payload.height || 'N/A'}\nExercise Days: ${payload.exerciseDays || 'N/A'}\nTimeline: ${payload.timeline || 'N/A'}\nLanguage: ${payload.language || 'en'}\nHow did they hear about us: ${payload.referral || 'Not specified'}`;
      html = `
        <h3>New PrepBite Member Registered</h3>
        <p><strong>Name:</strong> ${payload.name || 'Anonymous'}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Gender:</strong> ${payload.gender || 'Not specified'}</p>
        <p><strong>Current Weight:</strong> ${payload.currentWeight || 'N/A'}</p>
        <p><strong>Ideal Weight:</strong> ${payload.idealWeight || 'N/A'}</p>
        <p><strong>Height:</strong> ${payload.height || 'N/A'}</p>
        <p><strong>Exercise Days:</strong> ${payload.exerciseDays || 'N/A'}</p>
        <p><strong>Goal Timeline:</strong> ${payload.timeline || 'N/A'}</p>
        <p><strong>Language:</strong> ${payload.language || 'en'}</p>
        <p><strong>How did they hear about us:</strong> ${payload.referral || 'Not specified'}</p>
      `;
    } else {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    const toEmail = process.env.GMAIL_USER || 'PrepBite.support@gmail.com';
    if (toEmail && process.env.GMAIL_APP_PASSWORD) {
      try {
        await sendMail(toEmail, subject, html, text);
      } catch (emailErr) {
        console.error('Email helper failed:', emailErr);
        // Don't fail the API response for email errors
      }
    } else {
      console.warn('Email not configured: GMAIL_USER or GMAIL_APP_PASSWORD missing');
    }
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
