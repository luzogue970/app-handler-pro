import { describe, it, expect } from "vitest";

describe("front smoke tests", () => {
  it("basic arithmetic works", () => {
    expect(1 + 1).toBe(2);
  });

  it("can stringify a repo object", () => {
    const repo = { name: "my-repo", path: "/tmp" };
    const s = JSON.stringify(repo);
    expect(s).toContain('"name":"my-repo"');
    expect(s).toContain('"path":"/tmp"');
  });
});