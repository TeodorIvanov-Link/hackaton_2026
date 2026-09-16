# SummerTeamBackend

Evaluates SMS/WhatsApp campaign content against audience data using Claude.

## Run it

### Option A - locally

Requires Node.js 22+.

```bash
git clone https://github.com/TeodorIvanov-Link/hackaton_2026.git
cd hackaton_2026
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | your Claude API key |
| `API_AUTH_TOKEN` | yes | any random string - clients must send it as the `x-api-key` header; the server refuses to start without it |
| `PORT` | no | defaults to `3000` |
| `CLAUDE_MODEL` | no | defaults to `claude-opus-5`; use `claude-sonnet-5` or `claude-haiku-4-5` for a faster/cheaper demo |

```bash
npm run dev
```

Server listens on `http://localhost:3000`.

### Option B - GitHub Codespaces

1. On the repo page: **Code → Codespaces → Create codespace on main**. `.devcontainer/devcontainer.json` sets up Node and runs `npm install` automatically.
2. Add the two required secrets once, so every future Codespace gets them automatically: repo **Settings → Secrets and variables → Codespaces** → add `ANTHROPIC_API_KEY` and `API_AUTH_TOKEN`.
3. Inside the Codespace terminal: `npm run dev`.
4. **Ports** tab → port `3000` → set visibility to **Public** if you need to call it from outside the Codespace (e.g. from a teammate's machine). The forwarded URL looks like `https://<codespace-name>-3000.app.github.dev`.

## Calling the API

Every request needs the `x-api-key` header (value = your `API_AUTH_TOKEN`). Requests without it get `401`.

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

**bash / curl:**

```bash
curl -X POST "http://localhost:3000/evaluate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_AUTH_TOKEN" \
  -d '{"campaignType":"sms","audience":{"segment":"Existing customers"},"content":"Flash sale! 30% off today only."}'
```

**PowerShell** (prefer `Invoke-RestMethod` - avoids native-argument quoting issues with `curl.exe` on Windows PowerShell):

```powershell
$headers = @{ "x-api-key" = "YOUR_API_AUTH_TOKEN" }
$body = @{
    campaignType = "sms"
    audience = @{ segment = "Existing customers" }
    content = "Flash sale! 30% off today only."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/evaluate" -Method Post -Headers $headers -ContentType "application/json" -Body $body
```

## How it works

- `data/historical-data.json` - historical campaign examples (replace with the real dataset). Embedded into the system prompt and cached (`cache_control: ephemeral`) since it's static across requests.
- `src/systemPrompt.ts` - builds the system prompt that carries the historical data and scoring instructions.
- `src/evaluateContent.ts` - calls Claude with a structured output schema (`EvaluationResultSchema`) so the response is always valid JSON, no parsing needed.
- `src/index.ts` - `POST /evaluate` endpoint, gated by the `x-api-key` header (constant-time comparison via `crypto.timingSafeEqual`).
