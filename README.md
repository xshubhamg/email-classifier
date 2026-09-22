# Email Classifier — TypeSafe Jev (System One)

Fast, structured email triage with [Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev): one API call per email evaluates department (Choice), urgency/sales-pitch/phish signals (Nouls), and frustration/priority (Scores) **in parallel**, then pure code in `src/policy.ts` decides `quarantine | notify_urgent | auto_label | route_human | route_team`.

## Setup

```bash
npm install
cp .env.example .env   # add TYPESAFE_API_KEY
```

Model is pinned to `jev-1.13.0` (via `JEV_MODEL`) for stable thresholds. Without a key, everything runs in mock-heuristic mode so you can develop offline.

## Use

```bash
npm run classify -- --file data/emails.json        # human-readable table
npm run classify -- --file data/emails.json --json # JSON output
npm run eval                                        # accuracy vs gold labels
npm run api                                         # tiny HTTP API on :3000
```

### HTTP API

- `GET /health` → `{ ok, model, questionSet, keyConfigured }`
- `POST /classify` `{ subject, body, from? }` → full typed result + `action`/`route`
- `POST /classify/batch` `{ emails: [...] }` (max 50)

```bash
curl -s localhost:3000/classify -H 'Content-Type: application/json' -d '{
  "subject": "Stripe integration failing — losing sales",
  "from": "customer@acme.com",
  "body": "Trying to connect Stripe for 3 days, losing sales. Help ASAP."
}' | jq '{department, spamRisk, action, route}'
```

## Custom categories

Your labels live in `src/questions.ts` (`emailQuestions`, versioned as `EMAIL_Q_V1`). To use your own taxonomy, edit the `department` Choice criteria + descriptions, bump the version, and re-run `npm run eval` to re-tune thresholds in `src/policy.ts`. Keep questions atomic (one signal each); combine with weights in code rather than one big "is this X?" question.
