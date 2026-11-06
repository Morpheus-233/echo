import { describe, expect, it } from "vitest";
import { applyReview, initialDueOn, stageLabel } from "./schedule";
import { addDays } from "./date";

describe("initialDueOn", () => {
  it("anchors the first review two days after the note", () => {
    expect(initialDueOn("2026-11-05")).toBe("2026-11-07");
  });

  it("crosses a month boundary cleanly", () => {
    expect(initialDueOn("2026-11-30")).toBe("2026-12-02");
  });
});

describe("applyReview", () => {
  const noteDate = "2026-11-05";
  const today = "2026-11-07";

  it("moves to the next rung on a correct answer, measured from the note date", () => {
    expect(applyReview({ stage: 0, noteDate }, true, today)).toEqual({
      stage: 1,
      dueOn: "2026-11-08", // noteDate + 3
      status: "active",
    });
  });

  it("keeps climbing the ladder", () => {
    expect(applyReview({ stage: 1, noteDate }, true, "2026-11-08")).toEqual({
      stage: 2,
      dueOn: "2026-11-12", // noteDate + 7
      status: "active",
    });
  });

  it("declares a card learned after the final rung", () => {
    const result = applyReview({ stage: 4, noteDate }, true, "2026-12-10");
    expect(result.status).toBe("learned");
    expect(result.stage).toBe(4);
  });

  it("drops a rung and returns in two days on a miss", () => {
    expect(applyReview({ stage: 3, noteDate }, false, "2026-11-21")).toEqual({
      stage: 2,
      dueOn: "2026-11-23",
      status: "active",
    });
  });

  it("never drops below the first rung", () => {
    expect(applyReview({ stage: 0, noteDate }, false, "2026-11-07")).toEqual({
      stage: 0,
      dueOn: "2026-11-09",
      status: "active",
    });
  });

  it("does not schedule a card in the past when it was answered very late", () => {
    // A card reviewed 40 days late must not land 20 days in the past.
    const result = applyReview({ stage: 0, noteDate }, true, "2026-12-15");
    expect(result.dueOn).toBe("2026-12-16");
  });
});

describe("stageLabel", () => {
  it("names the rung by its day", () => {
    expect(stageLabel(0)).toBe("day 2");
    expect(stageLabel(4)).toBe("day 35");
  });
});

describe("addDays", () => {
  it("handles leap days", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-28", 2)).toBe("2028-03-01");
  });
});
