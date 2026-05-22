import { describe, expect, it } from "vitest";
import { normalizeErrorType } from "./errorTypes.js";

describe("normalizeErrorType", () => {
  it.each([
    { input: "grammar", expected: "Grammar and Spelling" },
    { input: "Tone and Social Conventions", expected: "Tone and Social Conventions" },
    { input: "unknown-category", expected: "Elaboration" },
  ])("maps $input to $expected", ({ input, expected }) => {
    expect(normalizeErrorType(input)).toBe(expected);
  });
});
