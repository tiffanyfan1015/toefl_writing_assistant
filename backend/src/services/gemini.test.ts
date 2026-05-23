import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  extractJsonObjectText,
  normalizeScore,
  parseJsonWithSchema,
} from "./gemini.js";

const sampleErrorSchema = z.object({
  type: z.string(),
  incorrect: z.string(),
  suggestion: z.string(),
});

const sampleSchema = z.object({
  score: z.number(),
  feedback: z.string(),
  errors: z
    .union([z.array(sampleErrorSchema), z.null()])
    .optional()
    .transform((val) => val ?? []),
});

type SampleParsed = z.output<typeof sampleSchema>;

describe("extractJsonObjectText", () => {
  it.each([
    {
      name: "clean JSON text",
      input: '{"a":1}',
      expected: '{"a":1}',
    },
    {
      name: "fenced json code block",
      input: '```json\n{"score": 4, "feedback": "ok", "errors": []}\n```',
      expected: '{"score": 4, "feedback": "ok", "errors": []}',
    },
  ])("$name", ({ input, expected }) => {
    expect(extractJsonObjectText(input)).toBe(expected);
  });

  it.each([
    { name: "no JSON object", input: "no json here" },
    { name: "empty string", input: "" },
  ])("throws when $name", ({ input }) => {
    expect(() => extractJsonObjectText(input)).toThrow(
      /Failed to parse AI response as JSON/,
    );
  });
});

describe("parseJsonWithSchema", () => {
  it.each([
    {
      name: "valid JSON with empty errors",
      input: '{"score":4,"feedback":"Good","errors":[]}',
      assert: (result: SampleParsed) => {
        expect(result.score).toBe(4);
        expect(result.feedback).toBe("Good");
        expect(result.errors).toEqual([]);
      },
    },
    {
      name: "errors field omitted",
      input: '{"score":3,"feedback":"ok"}',
      assert: (result: SampleParsed) => {
        expect(result.score).toBe(3);
        expect(result.errors).toEqual([]);
      },
    },
    {
      name: "errors field null",
      input: '{"score":3,"feedback":"ok","errors":null}',
      assert: (result: SampleParsed) => {
        expect(result.score).toBe(3);
        expect(result.errors).toEqual([]);
      },
    },
  ] as const satisfies ReadonlyArray<{
    name: string;
    input: string;
    assert: (result: SampleParsed) => void;
  }>)("$name", ({ input, assert }) => {
    assert(parseJsonWithSchema(input, sampleSchema));
  });

  it.each([
    { name: "malformed JSON", input: "{not json}" },
    { name: "JSON missing required fields", input: '{"score":4}' },
  ])("throws on $name", ({ input }) => {
    expect(() => parseJsonWithSchema(input, sampleSchema)).toThrow();
  });
});

describe("normalizeScore", () => {
  it.each([
    { name: "keeps 5 unchanged", input: 5, expected: 5 },
    { name: "clamps 6 to 5", input: 6, expected: 5 },
    { name: "rounds 3.3 to 3.5", input: 3.3, expected: 3.5 },
    { name: "maps NaN to 0", input: Number.NaN, expected: 0 },
    { name: 'maps "five" to 0', input: "five", expected: 0 },
    { name: "clamps -1 to 0", input: -1, expected: 0 },
  ])("$name", ({ input, expected }) => {
    expect(normalizeScore(input)).toBe(expected);
  });
});
