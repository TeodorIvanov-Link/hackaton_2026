import { z } from "zod";

const DistributionSchema = z.record(z.string(), z.number());

export const EvaluateRequestSchema = z.object({
  audience: z.string(),
  totalContacts: z.number().int().positive(),
  genderDistribution: DistributionSchema.optional(),
  ageDistribution: DistributionSchema.optional(),
  interests: DistributionSchema.optional(),
  content: z.string().min(1),
});
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

export const EvaluationResultSchema = z.object({
  expectedSuccessRate: z
    .number()
    .min(0)
    .max(100)
    .describe("Predicted campaign success rate as a percentage, calibrated against the historical examples"),
  reasoning: z.string().describe("Short explanation of the prediction, referencing what drove the number up or down"),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
