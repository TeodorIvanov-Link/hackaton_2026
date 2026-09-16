import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { EvaluateRequestSchema } from "./types.js";
import { evaluateContent } from "./evaluateContent.js";

const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;
if (!API_AUTH_TOKEN) {
  throw new Error("API_AUTH_TOKEN is not set - refusing to start with an unprotected endpoint");
}

function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const provided = Buffer.from(req.header("x-api-key") ?? "");
  const expected = Buffer.from(API_AUTH_TOKEN!);
  const valid = provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const app = express();
app.use(express.json());

app.post("/evaluate", requireApiKey, async (req, res) => {
  const parsed = EvaluateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await evaluateContent(parsed.data);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Evaluation failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
