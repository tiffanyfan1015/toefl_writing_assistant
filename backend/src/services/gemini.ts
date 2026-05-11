import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface EvaluationResult {
  score: number;
  feedback: string;
  errors: Array<{
    type: string;
    incorrect: string;
    suggestion: string;
    explanation: string;
  }>;
}

export async function evaluateEssay(prompt: string, essay: string): Promise<EvaluationResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
