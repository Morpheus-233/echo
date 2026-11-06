import { describe, expect, it } from "vitest";
import { parseModelJson, GeneratedSetSchema } from "./llm";

const valid = {
  cards: [
    {
      question: "What happens to memory that is allocated and never freed?",
      options: [
        "It stays referenced and the process keeps growing",
        "It is reclaimed by the operating system immediately",
        "It moves to the stack",
        "It is compressed by the allocator",
      ],
      correctIndex: 0,
    },
  ],
  suggestion: null,
};

describe("parseModelJson", () => {
  it("parses a clean object", () => {
    const result = parseModelJson(JSON.stringify(valid));
    expect(result.cards).toHaveLength(1);
    expect(result.suggestion).toBeNull();
  });

  it("unwraps fenced JSON", () => {
    const result = parseModelJson("```json\n" + JSON.stringify(valid) + "\n```");
    expect(result.cards[0].correctIndex).toBe(0);
  });

  it("digs JSON out of surrounding prose", () => {
    const result = parseModelJson("Sure! Here you go:\n" + JSON.stringify(valid) + "\nHope that helps.");
    expect(result.cards).toHaveLength(1);
  });

  it("throws on prose with no JSON", () => {
    expect(() => parseModelJson("I cannot help with that.")).toThrow(/JSON/);
  });

  it("rejects the wrong number of options", () => {
    const broken = { cards: [{ ...valid.cards[0], options: ["a", "b", "c"] }] };
    expect(() => parseModelJson(JSON.stringify(broken))).toThrow(/schema|option/i);
  });

  it("rejects duplicate options", () => {
    const broken = {
      cards: [
        {
          ...valid.cards[0],
          options: ["same answer", "same answer", "other", "another"],
        },
      ],
    };
    const parsed = GeneratedSetSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
  });

  it("rejects a correctIndex outside the options", () => {
    const broken = { cards: [{ ...valid.cards[0], correctIndex: 4 }] };
    expect(GeneratedSetSchema.safeParse(broken).success).toBe(false);
  });

  it("maps an empty suggestion to null", () => {
    const result = parseModelJson(JSON.stringify({ ...valid, suggestion: "   " }));
    expect(result.suggestion).toBeNull();
  });
});
