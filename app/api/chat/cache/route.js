// path : app/api/chat/cache


import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/picrate';
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const fixedPrompt = `Check if the provided image is of a celebrity or is not human, or is AI-generated or CGI. If any of these conditions are true, **just reply file_type:"No"** Nothing else.

You are a skilled mathematician specializing in facial analysis. I will provide an image for you to assess.

Otherwise, please rate the following aspects on a scale of 1 to 10, now use decimal numbers:

1. Golden Ratio
2. Facial Symmetry
3. Averageness
4. Facial Feature Ratios
5. Dress Code
6. Picture Angle

Please provide feedback on the image. Describe the person's appearance using one of these terms: cute, hot, handsome (for men), sexy, or nerdy.

**Note: Please reply only in this format: Golden Ratio - 5.4, Facial Symmetry - 5, Averageness - 7, Facial Feature Ratios - 8, Dress Code - 5, Picture Angle - 6, appearance - "cute"**`;


let cachedClient = null;
let cachedDb = null;

async function calculateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function analyzeImage(buffer) {
  try {
    const mimeType = 'image/jpeg';
    const result = await model.generateContent(
      [
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: mimeType
          }
        },
        fixedPrompt
      ],
      generationConfig
    );
    return result.response.text();
  } catch (error) {
    // console.error('Error analyzing image:', error);
    throw error;
  }
}

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

function parseAnalysis(analysis) {
  if (analysis.includes('file_type:"No"')) {
    return null;
  }

  const parsed = {};
  analysis.split(',').forEach(item => {
    const [key, value] = item.trim().split('-').map(s => s.trim());
    if (key && value) {
      parsed[key] = value.replace(/"/g, '');
    }
  });
  return parsed;
}

function calculateFinalScore(results) {
  if (!results) return 0;

  const scoreKeys = ["Golden Ratio", "Facial Symmetry", "Averageness",
    "Facial Feature Ratios", "Dress Code", "Picture Angle"];

  const scores = scoreKeys.map(key => parseFloat(results[key]) || 0);
  const sum = scores.reduce((acc, curr) => acc + curr, 0);
  return 85;
}
  // return Math.round((sum / 60) * 100) - 10;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get('hash');

  if (!hash) {
    return NextResponse.json({ error: 'No hash provided' }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const cacheCollection = db.collection('cache');
    const cachedResult = await cacheCollection.findOne({ hash });

    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        imageData: `data:image/jpeg;base64,${cachedResult.imageData}`
      });
    } else {
      return NextResponse.json({ message: 'Not found in cache' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error in cache GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const hash = await calculateHash(buffer);

    const { db } = await connectToDatabase();
    const cacheCollection = db.collection('cache');

    // Check cache first
    const cachedResult = await cacheCollection.findOne({ hash });
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        imageData: `data:image/jpeg;base64,${cachedResult.imageData}`
      });
    }

    // Analyze image if not in cache
    const analysis = await analyzeImage(buffer);
    const parsedResults = parseAnalysis(analysis);
    const score = calculateFinalScore(parsedResults);

    const cacheEntry = {
      hash,
      results: parsedResults,
      score,
      createdAt: new Date(),
      imageData: buffer.toString('base64')
    };

    await cacheCollection.insertOne(cacheEntry);

    return NextResponse.json({
      ...cacheEntry,
      imageData: `data:image/jpeg;base64,${cacheEntry.imageData}`
    });
  } catch (error) {
    console.error('Error in POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
