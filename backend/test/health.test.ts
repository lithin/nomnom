import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/db", () => import("./testDb"));

import { createApp } from "../src/app";

const app = createApp();

describe("GET /health", () => {
  it("responds without an API key", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toMatchObject({ status: "ok" });
  });
});
