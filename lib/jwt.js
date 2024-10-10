import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function generateImageToken(imageId: string): string {
  return sign({ imageId }, JWT_SECRET, { expiresIn: '1h' });
}

export function verifyImageToken(token: string): string | null {
  try {
    const decoded = verify(token, JWT_SECRET) as { imageId: string };
    return decoded.imageId;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}