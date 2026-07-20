import https from "node:https";
import { describe, expect, it } from "vitest";

// Locks in the setup.ts guarantee: integration tests can never reach a
// third-party service, even through an unmocked dependency.
describe("network kill switch", () => {
  it("blocks fetch to non-loopback hosts", () => {
    expect(() => fetch("https://generativelanguage.googleapis.com")).toThrow(
      /Blocked outbound request/,
    );
  });

  it("blocks https.request to non-loopback hosts", () => {
    expect(() => https.request("https://example.com")).toThrow(/Blocked outbound request/);
  });
});
