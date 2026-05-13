import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

interface QuestionResult {
  title: string;
  content: string;
}

export async function generateQuestion(type: "Email" | "Academic"): Promise<QuestionResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const systemPrompt = `
    You are an expert TOEFL test creator. Generate a new TOEFL writing question for the specified type.
    Return the result in strict JSON format as follows:
    {
      "title": "A short, descriptive title for the task",
      "content": "The full text of the prompt, including all necessary context and instructions."
    }
    
    IMPORTANT: Use double line breaks (\n\n) to separate paragraphs and different sections (like professor's question vs students' opinions) in the "content" field to ensure readability.
    
    If type is "Email", the prompt should involve responding to a professor or administrator about a course or school-related issue (7 minutes limit).
    If type is "Academic", the prompt should be a discussion post where a professor asks a question and two students give brief opinions, and the user must contribute (100+ words).
  `;

  const fullPrompt = `${systemPrompt}\n\nType: ${type}`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}

interface EvaluationResult {
  score: number;
  feedback: string;
  errors: {
    type: "Grammar" | "Spelling";
    incorrect: string;
    suggestion: string;
    explanation: string;
  }[];
}

// Move initialization inside the function or re-initialize to ensure env vars are fresh
export async function evaluateEssay(prompt: string, essay: string): Promise<EvaluationResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  console.log(`Calling Gemini with model: ${modelName}`);
  const model = genAI.getGenerativeModel({ model: modelName });

  const systemPrompt = `
    You are an expert TOEFL writing grader. Evaluate the following essay based on the prompt provided.
    Provide a score from 1 to 5.
    Identify all grammar and spelling errors.
    Return the result in strict JSON format as follows:
    {
      "score": number,
      "feedback": "overall feedback string",
      "errors": [
        {
          "type": "Grammar" | "Spelling",
          "incorrect": "the wrong text",
          "suggestion": "the corrected text",
          "explanation": "why it was wrong"
        }
      ]
    }
  `;

  const fullPrompt = `${systemPrompt}\n\nPrompt: ${prompt}\n\nEssay: ${essay}`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();
  
  // Basic JSON extraction in case there's markdown wrapping
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  return JSON.parse(jsonMatch[0]);
}
