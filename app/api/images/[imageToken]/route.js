import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

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
  
  return { client, db: cachedDb };
}

export async function GET(request, { params }) {
  try {
    const imageId = params.imageId;
    const { db } = await connectToDatabase();
    
    // Try to find the image in the images collection first
    const imagesCollection = db.collection('images');
    let imageDocument = await imagesCollection.findOne({ imageId });
    
    if (!imageDocument) {
      // If not in images, try the scorers collection
      const scorersCollection = db.collection('scorers');
      const scorer = await scorersCollection.findOne({ imageId });
      if (scorer) {
        imageDocument = { imageData: scorer.avatar };
      }
    }
    
    if (!imageDocument || !imageDocument.imageData) {
      return new NextResponse(null, { status: 404 });
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(imageDocument.imageData, 'base64');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse(null, { status: 500 });
  }
}