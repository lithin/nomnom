import type { Request, Response, Router } from "express";

export const setupHealthEndpoint = (app: Router) => {
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });
};
