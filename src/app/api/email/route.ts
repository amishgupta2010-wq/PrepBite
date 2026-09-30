import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

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

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Send to yourself
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
