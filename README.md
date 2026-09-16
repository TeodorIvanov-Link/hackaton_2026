# Campaign Relevance Evaluator

Evaluates SMS/WhatsApp campaign content against audience data using Claude.

## Setup

```bash
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev
```

## How it works

- `data/historical-data.json` - historical campaign examples (replace with the real dataset). Embedded into the system prompt and cached (`cache_control: ephemeral`) since it's static across requests.
- `src/systemPrompt.ts` - builds the system prompt that carries the historical data and scoring instructions.
- `src/evaluateContent.ts` - calls Claude with a structured output schema (`EvaluationResultSchema`) so the response is always valid JSON, no parsing needed.
- `src/index.ts` - `POST /evaluate` endpoint.

## API

```
POST /evaluate
{
  "campaignType": "sms" | "whatsapp",
  "audience": { ... freeform audience/segment data ... },
  "content": "the campaign text to evaluate"
}
```

Response:

```json
{
  "relevanceScore": 82,
  "verdict": "relevant",
  "reasoning": "...",
  "flags": []
}
```

Model defaults to `claude-opus-5`; override with `CLAUDE_MODEL` in `.env` (e.g. `claude-sonnet-5` or `claude-haiku-4-5`) for faster/cheaper responses during the demo.
