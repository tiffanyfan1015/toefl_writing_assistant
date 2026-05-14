import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

interface QuestionResult {
  title: string;
  content: string;
}

function parseJsonObject<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to parse AI response as JSON. Response: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Failed to parse AI JSON: ${(error as Error).message}. Response: ${text.slice(0, 300)}`);
  }
}

export async function generateQuestion(type: "Email" | "Academic"): Promise<QuestionResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const systemPrompt = `
    You are a senior TOEFL test developer specialized in English for Academic Purposes (EAP). Your goal is to generate a realistic writing prompt.
    Return one valid JSON object only. Do not include markdown fences, commentary, or text outside the JSON object.
    The JSON must be parseable by JSON.parse. Escape all newline characters inside string values as \\n.

    JSON STRUCTURE:
    {
      "title": "Title of the task",
      "content": "Full prompt text"
    }

    TASK SPECIFICATIONS:
    1. "Email" Type:
      - Scenario: Communicating with a university professor or administrator.
      - Requirement: Include 3 specific bulleted tasks (e.g., explain a problem, request a meeting, propose a solution).
      - Tone: Formal and professional.

    2. "Academic" Type (Discussion Board):
      - Format: A professor posts a question followed by two brief student responses (Student A and Student B).
      - Requirement: The user must add their own perspective, agreeing/disagreeing or adding new insight.
      - Tone: Academic yet conversational.

    CONTENT FORMATTING:
    Use double line breaks (\\n\\n) to clearly separate:
    - The general instructions.
    - The professor's post (for Academic).
    - The individual student viewpoints (for Academic).
    - The specific bullet points (for Email).
    `;

  const fullPrompt = `${systemPrompt}\n\nType: ${type}`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();

  const parsed = parseJsonObject<QuestionResult>(text);
  if (!parsed.title || !parsed.content) {
    throw new Error(`AI response is missing title or content. Response: ${text.slice(0, 300)}`);
  }

  return parsed;
}

interface EvaluationResult {
  score: number;
  feedback: string;
  errors: {
    type:
      | "Grammar and Spelling"
      | "Elaboration"
      | "Tone and Social Conventions"
      | "Adherence to Task"
      | "Idiomatic Word Choice"
      | "Relevance to Discussion";
    incorrect: string;
    suggestion: string;
    explanation: string;
  }[];
}

// Move initialization inside the function or re-initialize to ensure env vars are fresh
export async function evaluateEssay(taskType: "Email" | "Academic", prompt: string, essay: string): Promise<EvaluationResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  console.log(`Calling Gemini with model: ${modelName}`);
  const model = genAI.getGenerativeModel({ model: modelName });

  const emailRubric = `
    Email rubric:
    5: Fully successful response. Effective, clearly expressed, consistent language facility, effective elaboration, precise idiomatic word choice, appropriate politeness/register/organization, almost no lexical or grammatical errors.
    4: Generally successful. Mostly effective and easily understood, adequate elaboration, syntactic variety, appropriate word choice, mostly appropriate social conventions, few errors.
    3: Partially successful. Generally accomplishes task, but language limitations may reduce clarity/effectiveness; partial elaboration; moderate syntax/vocabulary; noticeable errors or social convention issues.
    2: Mostly unsuccessful. Attempted but mostly ineffective; limited or irrelevant elaboration; limited syntax/vocabulary; accumulating errors.
    1: Unsuccessful. Ineffective attempt, very little elaboration, telegraphic language, serious frequent errors, minimal original language.
    0: Unscorable. Blank, rejects topic, not English, copied from prompt, unrelated, or arbitrary keystrokes.
  `;

  const academicRubric = `
    Academic Discussion rubric:
    5: Fully successful response. Relevant and very clearly expressed contribution, consistent language facility, well-elaborated explanations/examples/details, syntactic variety, precise idiomatic word choice, almost no lexical or grammatical errors.
    4: Generally successful. Relevant contribution, easy to understand, adequately elaborated explanations/examples/details, varied syntax, appropriate word choice, few errors.
    3: Partially successful. Mostly relevant and understandable, but elaboration may be missing/unclear/irrelevant in places; some variety in syntax/vocabulary; noticeable lexical or grammatical errors.
    2: Mostly unsuccessful. Attempted contribution but ideas may be hard to follow; poor or partially relevant elaboration; limited syntax/vocabulary; accumulating errors.
    1: Unsuccessful. Ineffective contribution with few coherent ideas, severely limited syntax/vocabulary, serious frequent errors, minimal original language.
    0: Unscorable. Blank, rejects topic, not English, copied from prompt, unrelated, or arbitrary keystrokes.
  `;

  const systemPrompt = `
    You are an expert TOEFL writing grader. Evaluate the response based on the provided TOEFL ${taskType} task and its official-style rubric.
    Use the rubric below and provide a score from 0 to 5 in 0.5-point increments only.
    ${taskType === "Email" ? emailRubric : academicRubric}

    Identify edits and improvement opportunities by these exact categories only:
    - "Grammar and Spelling": grammar, spelling, punctuation, word form, agreement, tense, sentence mechanics.
    - "Elaboration": missing support, unclear examples, underdeveloped ideas, weak specificity.
    - "Tone and Social Conventions": politeness, register, email conventions, discussion etiquette, naturalness.
    - "Adherence to Task": missing required bullets, off-topic content, insufficient response to the professor/question, copied or irrelevant content.
    - "Idiomatic Word Choice": unnatural phrasing, awkward collocations, imprecise word choice, non-idiomatic expressions.
    - "Relevance to Discussion": for Academic Discussion tasks, whether the response meaningfully connects to the professor's question and classmates' points; for Email tasks, use this only when the response drifts into discussion-like commentary instead of the requested email purpose.

    For each error or improvement, quote a short exact text span from the essay in "incorrect" when possible. For missing content, use the closest related text span or "Missing content".
    The score must be one of: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5.
    Return the result in strict JSON format as follows:
    {
      "score": number,
      "feedback": "overall feedback string explaining the score with reference to the rubric",
      "errors": [
        {
          "type": "Grammar and Spelling" | "Elaboration" | "Tone and Social Conventions" | "Adherence to Task" | "Idiomatic Word Choice" | "Relevance to Discussion",
          "incorrect": "the text to revise, or Missing content",
          "suggestion": "the revised text or concrete improvement",
          "explanation": "why this change improves the TOEFL response"
        }
      ]
    }
  `;

  const fullPrompt = `${systemPrompt}\n\nTask Type: ${taskType}\n\nPrompt: ${prompt}\n\nEssay: ${essay}`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();
  
  const parsed = parseJsonObject<EvaluationResult>(text);
  const rawScore = Number(parsed.score);
  const boundedScore = Math.min(5, Math.max(0, Number.isFinite(rawScore) ? rawScore : 0));

  return {
    ...parsed,
    score: Math.round(boundedScore * 2) / 2,
  };
}
