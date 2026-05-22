export const CANONICAL_ERROR_TYPES = [
  "Grammar and Spelling",
  "Elaboration",
  "Tone and Social Conventions",
  "Adherence to Task",
  "Idiomatic Word Choice",
  "Relevance to Discussion",
] as const;

export type CanonicalErrorType = (typeof CANONICAL_ERROR_TYPES)[number];

export function normalizeErrorType(raw: string): CanonicalErrorType {
  const normalized = raw.trim().toLowerCase();

  if (
    normalized === "grammar" ||
    normalized === "spelling" ||
    normalized === "grammar and spelling"
  ) {
    return "Grammar and Spelling";
  }
  if (
    normalized === "tone" ||
    normalized === "social conventions" ||
    normalized === "tone and social conventions"
  ) {
    return "Tone and Social Conventions";
  }
  if (
    normalized === "adherence" ||
    normalized === "task" ||
    normalized === "adherence to task"
  ) {
    return "Adherence to Task";
  }
  if (
    normalized === "idiomatic word choice" ||
    normalized === "word choice" ||
    normalized === "idiomatic"
  ) {
    return "Idiomatic Word Choice";
  }
  if (
    normalized === "relevance to discussion" ||
    normalized === "relevance" ||
    normalized === "discussion relevance"
  ) {
    return "Relevance to Discussion";
  }
  if (normalized === "elaboration") {
    return "Elaboration";
  }

  if ((CANONICAL_ERROR_TYPES as readonly string[]).includes(raw)) {
    return raw as CanonicalErrorType;
  }

  console.warn("Unknown error category from Gemini:", raw);
  return "Elaboration";
}
