import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

try {
  console.log('Listing available models...');
  const models = await genAI.models.list();
  console.log('Available models:', JSON.stringify(models, null, 2));
} catch (error) {
  console.error('Error listing models:', error);
}