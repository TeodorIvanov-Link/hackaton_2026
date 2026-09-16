import { z } from "zod";

export const EvaluateRequestSchema = z.object({
  campaignType: z.enum(["sms", "whatsapp"]),
  audience: z.record(z.string(), z.unknown()),
  content: z.string().min(1),
});
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

export const EvaluationResultSchema = z.object({
  relevanceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How relevant the content is to the given audience, 0-100"),
  verdict: z.enum(["highly_relevant", "relevant", "partially_relevant", "irrelevant"]),
  reasoning: z.string().describe("Short explanation of the score"),
  flags: z
    .array(z.string())
    .describe("Specific issues found, e.g. tone mismatch, wrong segment, compliance risk"),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
