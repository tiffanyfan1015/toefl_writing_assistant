import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function listModels() {
  try {
    const modelList = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use any model to get the object
    // Actually the SDK has a listModels method
    // @ts-ignore
    const result = await genAI.listModels();
    console.log("Available models:");
    result.models.forEach((m: any) => console.log(m.name));
  } catch (e) {
    console.error("Error listing models:", e);
  }
}

listModels();
