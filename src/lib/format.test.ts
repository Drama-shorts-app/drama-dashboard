import { describe, expect, it } from "vitest";

import { formatBytes, formatDuration, formatStatus } from "./format";

describe("formatters", () => {
  it("formats media values for the operator panel", () => {
    expect(formatBytes(1_572_864)).toBe("1.5 MiB");
    expect(formatDuration(3_723_000)).toBe("1:02:03");
    expect(formatStatus("not_uploaded")).toBe("Not uploaded");
  });
});
