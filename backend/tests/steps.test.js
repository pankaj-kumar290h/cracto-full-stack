import { describe, it, expect } from "vitest";
import { computeStatus, STEP_KEYS } from "../src/steps.js";

describe("computeStatus", () => {
  it("returns planned when no steps are completed", () => {
    expect(computeStatus([])).toBe("planned");
  });

  it("returns ongoing when some but not all steps are completed", () => {
    expect(computeStatus([STEP_KEYS[0]])).toBe("ongoing");
  });

  it("returns done when all steps are completed", () => {
    expect(computeStatus(STEP_KEYS)).toBe("done");
  });
});
