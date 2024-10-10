// path : app/api/chat/topScorers

import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import sharp from 'sharp';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/picrate';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  
  cachedClient = client;
  cachedDb = client.db();

  return { client: cachedClient, db: cachedDb };
}

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const scorersCollection = db.collection('scorers');
    
    const topScorers = await scorersCollection
      .find()
      .sort({ score: -1 })
      .limit(3)
      .toArray();
    
    // Convert stored base64 image data to data URLs
    const topScorersWithImages = topScorers.map(scorer => ({
      ...scorer,
      avatar: `data:image/jpeg;base64,${scorer.avatar}`
    }));
    
    return NextResponse.json(topScorersWithImages);
  } catch (error) {
    console.error('Error fetching top scorers:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const name = formData.get('name');
    const score = Number(formData.get('score'));
    const hash = formData.get('hash');
    const imageFile = formData.get('image');

    // console.log('Received form data:', { name, score, hash, imageFile: typeof imageFile });

    if (!name || isNaN(score) || !hash || !imageFile) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    let imageBuffer;
    if (imageFile instanceof Blob) {
      const arrayBuffer = await imageFile.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else if (typeof imageFile === 'string') {
      // If it's a base64 string, convert it to a buffer
      imageBuffer = Buffer.from(imageFile.split(',')[1], 'base64');
    } else {
      console.error('Unexpected image file type:', typeof imageFile);
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const scorersCollection = db.collection('scorers');

    // Process the image
    const resizedBuffer = await sharp(imageBuffer)
      .resize(80, 80, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const base64Image = resizedBuffer.toString('base64');

    await scorersCollection.updateOne(
      { name },
      { $set: { score, avatar: base64Image } },
      { upsert: true }
    );

    const topScorers = await scorersCollection
      .find()
      .sort({ score: -1 })
      .limit(3)
      .toArray();

    const topScorersWithImages = topScorers.map(scorer => ({
      ...scorer,
      avatar: `data:image/jpeg;base64,${scorer.avatar}`
    }));

    return NextResponse.json(topScorersWithImages);
  } catch (error) {
    console.error('Error updating top scorers:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}