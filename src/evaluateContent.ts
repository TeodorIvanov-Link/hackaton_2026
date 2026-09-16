import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { EvaluationResultSchema, type EvaluateRequest, type EvaluationResult } from "./types.js";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5";

export async function evaluateContent(request: EvaluateRequest): Promise<EvaluationResult> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // The historical dataset is static across requests - cache it so
        // repeated evaluations only pay full price for the new content.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify(request),
      },
    ],
    output_config: {
      format: zodOutputFormat(EvaluationResultSchema),
    },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to evaluate this content");
  }
  if (!response.parsed_output) {
    throw new Error("Claude did not return a parseable evaluation");
  }

  return response.parsed_output;
}
