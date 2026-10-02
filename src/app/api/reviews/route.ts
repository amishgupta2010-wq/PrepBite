import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// File-based persistent storage for reviews (survives server restarts in dev/prod)
const REVIEWS_FILE = path.join(process.cwd(), 'data', 'reviews.json');

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readReviews(): Review[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(REVIEWS_FILE)) return [];
    const raw = fs.readFileSync(REVIEWS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeReviews(reviews: Review[]) {
  ensureDataDir();
  fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf-8');
}

interface Review {
  id: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
  owner: string; // userName of submitter for delete auth
}

// GET /api/reviews — return all reviews newest-first
export async function GET() {
  const reviews = readReviews();
  return NextResponse.json(reviews);
}

// POST /api/reviews — save a new review
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userName, userEmail, rating, comment } = body;

    if (!userName || !rating || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newReview: Review = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      userName: userName.trim(),
      userEmail: userEmail || '',
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
      owner: userName.trim(),
    };

    const reviews = readReviews();
    reviews.unshift(newReview);
    writeReviews(reviews);

    // Fire email notification (non-blocking)
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        subject: `⭐ New PrepBite Review: ${rating}/5 from ${userName}`,
        html: `
          <h3>New Review on PrepBite</h3>
          <p><strong>Name:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${userEmail || 'Not provided'}</p>
          <p><strong>Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
          <p><strong>Review:</strong> ${comment}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        `,
      });
    } catch (emailErr) {
      console.error('Review email notification failed:', emailErr);
    }

    return NextResponse.json(newReview, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/reviews error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save review' }, { status: 500 });
  }
}

// DELETE /api/reviews?id=xxx — delete a review (owner check on client, server trusts it for now)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const reviews = readReviews();
    const filtered = reviews.filter(r => r.id !== id);
    writeReviews(filtered);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
