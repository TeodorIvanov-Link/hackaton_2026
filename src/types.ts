import { z } from "zod";

const DistributionSchema = z.record(z.string(), z.number());

export const EvaluateRequestSchema = z.object({
  audience: z.enum(["Loyal Customers", "New subscribers", "Custom campaign"]),
  totalContacts: z.number().int().positive(),
  genderDistribution: DistributionSchema.optional(),
  ageDistribution: DistributionSchema.optional(),
  interests: DistributionSchema.optional(),
  content: z.string().min(1),
});
export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

export const EvaluationResultSchema = z.object({
  estimatedReach: z
    .number()
    .int()
    .nonnegative()
    .describe("Predicted number of contacts actually reached/delivered"),
  engagement: z
    .number()
    .min(0)
    .max(100)
    .describe("Predicted engagement rate as a percentage"),
  conversations: z
    .number()
    .int()
    .nonnegative()
    .describe("Predicted number of successful conversations/conversions"),
  optOuts: z.number().int().nonnegative().describe("Predicted number of opt-outs/unsubscribes"),
  cost: z.number().nonnegative().describe("Predicted total campaign cost"),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;
