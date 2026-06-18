import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const isAuthorized = (providedApiKey: string, expectedApiKey: string) => {
  const provided = Buffer.from(providedApiKey, "utf8");
  const expected = Buffer.from(expectedApiKey, "utf8");

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
};

export const enforceApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/health") {
    next();
    return;
  }

  const expectedApiKey = process.env.BACKEND_API_KEY?.trim();
  if (!expectedApiKey) {
    res.status(500).json({ error: "Backend API key is not configured" });
    return;
  }

  const providedApiKey = req.header("x-api-key")?.trim();
  if (!providedApiKey || !isAuthorized(providedApiKey, expectedApiKey)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
