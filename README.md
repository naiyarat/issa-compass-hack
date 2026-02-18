## Overview & Improvements

The base assignment gave me a solid starting point: **generate an LLM reply from conversation context** and **update a stored “master prompt”** over time. From that, I wanted to improve the parts that _directly_ affect reply quality, focusing on context engineering + prompt optimization.

To do that, I built an **iterative self-improvement workflow** that reprompts itself using **three specialized prompts** (Responder → Grader → Editor). Instead of “trust me, the prompt got better at simulating a real consultant,” the system produces **measurable convergence** toward real consultant behavior and makes that improvement observable with statistics and graphical visualization.　

Two major improvements:

- **Behavioral optimization loop (not just prompt editing):** the assistant iteratively reduces a quantified gap between AI behavior and consultant behavior using structured scoring + targeted prompt edits.
- **Real-time streaming + visualization:** I added streaming to broadcast iteration-by-iteration progress so you can watch the prompt converge in real time (scores, deltas, and changes per iteration), plus UI charts/diffs to make improvements easy to interpret.

---

## Methodology

### 1) Three-prompt self-learning loop

The system improves the singleton **master prompt** using a closed loop:

1. **Responder prompt**
   - Input: `clientSequence` + `chatHistory` + `masterPrompt`
   - Output: `predictedReply` (the AI’s best DM-style consultant response)

2. **Grader prompt**
   - Input: `clientSequence` + `chatHistory` + `predictedReply` + `consultantReply`
   - Output: structured scores and a **delta** describing how far the AI reply is from the consultant’s behavioral profile

3. **Editor prompt**
   - Input: `masterPrompt` + grader output (scores, delta, diagnosis, recommended edits)
   - Output: **surgical updates** to `masterPrompt`

This sequence runs iteratively, producing progressively better prompts and replies.

---

### 2) Behavioral scoring on 7 metrics (and why it matters)

To make improvement concrete (and to avoid vibe prompt edits), I defined **7 behavioral metrics** and scored the AI reply _relative to_ the consultant reply:

- **proactiveness** — anticipates next steps / asks useful follow-ups
- **salesIntent** — nudges toward commitment (consultation, booking, next action)
- **empathy** — acknowledges user context and concerns
- **clarity** — readable, structured, low-friction understanding
- **urgency** — communicates time-sensitivity when appropriate
- **tone** — tone of the response (from robotic, purely factual, etc to casual, confident, human)
- **length** — reponse length and level of detail (not too short/long)

The grader produces:

- `aiScores`
- `consultantScores` (the target)
- `delta` (0..100): overall behavioral distance (lower = better)

---

### 3) Convergence-based optimization (threshold + max iterations)

Users can control the learning loop with two key parameters:

- **thresholdDelta**: stop early when the AI is “close enough” to consultant behavior
- **maxIterations**: hard cap to prevent infinite loops

During optimization, the system tracks the **best prompt so far** (lowest delta) and returns it even if convergence isn’t reached. This makes the loop robust when scoring noise or prompt constraints prevent perfect alignment.

Optional stability controls:

- **ensemble grading** (up to 3 grader runs) with averaged scores to reduce variance
- early stopping when delta stops improving for N iterations

---

### 4) Streaming + visualization (making learning observable)

To make the “self-learning” real and judge-friendly, the improvement endpoint streams per-iteration updates:

- predicted reply
- metric scores
- delta and best-delta-so-far
- diagnosis + recommended prompt edits
- prompt evolution tracking (hashes / diffs)

The UI uses this stream to render:

- **score convergence over time**
- **AI vs consultant behavioral charts**
- **prompt diffs** that show exactly what changed

This turns the project from a black-box chatbot into a transparent optimization system.

---

## Tech Stack

I used the **T3 stack** because it’s fast to bootstrap, easy to iterate on, and gives end-to-end type safety with minimal setup—great for a hackathon prototype.

- **Framework**: Next.js 15 + TypeScript
- **UI**: TailwindCSS v4
- **API layer**: tRPC (type-safe backend endpoints and client calls)
- **DB**: PostgreSQL with NeonDB
- **ORM**: Drizzle (migrations + schema)
- **AI provider**: Google Gemini (responder + grading + editor roles; architecture can support swapping providers, but I only have credits for Gemini)
- **Visualization**: Recharts (score charts) + prompt diff viewer (prompt evolution)

Note: using Drizzle + tRPC is probably overkill for a small prototype—but in T3 they’re “free” because the boilerplate and wiring are already set up.

## 🧪 API Testing with cURL (replace local host with base URL)

### Generate Reply

```bash
curl -X POST "http://localhost:3000/api/trpc/generateReply" \
  -H "Content-Type: application/json" \
  -d '{
    "clientSequence": "I am American and currently in Bali. Can I apply from Indonesia?",
    "chatHistory": [
      {
        "role": "client",
        "message": "Hello, I am interested in the DTV visa for Thailand. I work remotely as a software developer for a US company."
      },
      {
        "role": "consultant",
        "message": "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you would like to apply from?"
      }
    ]
  }'
```

### Auto Improve AI

```bash
curl -X POST "http://localhost:3000/api/trpc/improveAi" \
  -H "Content-Type: application/json" \
  -d '{
    "clientSequence": "I am American and currently in Bali. Can I apply from Indonesia?",
    "chatHistory": [
      {
        "role": "client",
        "message": "Hello, I am interested in the DTV visa for Thailand. I work remotely as a software developer for a US company."
      },
      {
        "role": "consultant",
        "message": "Hi there! Thank you for reaching out. The DTV (Destination Thailand Visa) is perfect for remote workers like yourself. May I know your nationality and which country you would like to apply from?"
      }
    ],
    "consultantReply": "Yes, you can apply from Indonesia! For remote workers, our service fees are 18,000 THB including all government fees. The processing time in Indonesia is typically around 10 business days.",
    "maxIterations": 3,
    "thresholdDelta": 20,
    "graderEnsembleCount": 1
  }'
```

### Manual Improve AI

```bash
curl -X POST "http://localhost:3000/api/trpc/improveAiManually" \
  -H "Content-Type: application/json" \
  -d '{
    "instructions": "Be more proactive about scheduling appointments. Always mention booking options when eligibility is confirmed."
  }'
```

## 🤖 System Prompts

The system uses three specialized AI prompts for self-learning:

### Master Responder Prompt

```text
You are a Thailand DTV immigration consultant replying in direct messages.

Goals:
- Be warm, concise, and practical.
- Match the client's energy and message length.
- Ask 1-2 clarifying questions when key details are missing.
- Use plain language and short numbered lists when giving requirements.

Rules:
- Do not claim final legal authority.
- Do not invent fees/timelines/country rules not provided in context.
- If unknown, say you will confirm with the legal team.
- Never mention being an AI assistant.

Output:
- Return a direct consultant-style reply only (no JSON wrapper).
```

### Grader Prompt (Behavioral Evaluation)

```text
You are a behavioral grader that evaluates how closely an AI consultant reply matches a human consultant reply in customer support style.

You are NOT grading correctness of visa information.
You are grading behavioral alignment only.

Given:
- clientSequence
- chatHistory
- predictedReply (AI)
- consultantReply (Human)

Score the predictedReply across the following dimensions relative to the consultantReply.
Each score MUST be from 0..100 where:

0 = extremely different from consultant behavior
100 = nearly identical behavioral intent

Use the consultantReply as the behavioral target.

----------------------------------------
DIMENSIONS (STRICT RUBRIC)
----------------------------------------

1. proactiveness
Measures whether the AI anticipates next steps or asks guiding follow-ups without being prompted.

Examples:
Low (0–20):
"Yes, you can apply from Indonesia."

Mid (40–60):
"Yes, you can apply from Indonesia. Let me know if you'd like more details."

High (80–100):
"Yes, you can apply from Indonesia. I recommend booking an embassy appointment soon as slots fill up quickly — would you like help scheduling?"

----------------------------------------

2. salesIntent
Measures how strongly the reply nudges toward commitment or action (booking, consultation, next step).

Low:
Purely informational, no call-to-action

Mid:
Soft CTA such as:
"Let me know if you'd like help."

High:
Clear conversion push such as:
"I recommend booking a consultation soon — I can walk you through the process if you'd like."

----------------------------------------

3. empathy
Measures whether the reply acknowledges user context, concerns, or effort.

Low:
Dry and factual

Mid:
Light acknowledgment:
"Thanks for sharing that you're currently in Bali."

High:
User-aware phrasing:
"Thanks for explaining your situation — applying from Indonesia is actually quite common for US remote workers."

----------------------------------------

4. clarity
Measures structural readability and ease of understanding.

Low:
Long, confusing, or multi-clause explanation

Mid:
Understandable but slightly verbose

High:
Concise, logically structured, direct response

----------------------------------------

5. urgency
Measures whether the reply communicates time sensitivity or opportunity cost.

Low:
No urgency language

Mid:
Implied timing:
"It's a good idea to do this soon."

High:
Explicit timing or scarcity:
"Appointments tend to fill quickly, so I'd recommend booking soon."

----------------------------------------

6. toneMatch
Measures stylistic similarity (formality, friendliness, confidence).

Low:
Sounds robotic, legalistic, or overly formal

Mid:
Neutral tone

High:
Conversational DM-style tone, sounds human and natural, friendly and professional

----------------------------------------

7. lengthMatch
Measures whether the reply length matches the consultant's level of detail.

Low:
Much shorter OR much longer than consultantReply

Mid:
Somewhat aligned

High:
Similar number of ideas and verbosity level

----------------------------------------

OUTPUT REQUIREMENTS

Compute:
- aiScores (for predictedReply)
- consultantScores (for consultantReply)
- delta = overall behavioral distance between aiScores and consultantScores from 0..100

Guidance:
- delta ≈ 0 means behaviors are nearly identical
- delta ≈ 100 means behaviors are very different

Return STRICT JSON only, diagnosis is REQUIRED and must be non-empty: 1-2 sentences explaining the main behavioral gaps between AI and consultant. Never return an empty diagnosis.
{
  "aiScores": {
    "proactiveness": number,
    "salesIntent": number,
    "empathy": number,
    "clarity": number,
    "urgency": number,
    "toneMatch": number,
    "lengthMatch": number
  },
  "consultantScores": {
    "proactiveness": number,
    "salesIntent": number,
    "empathy": number,
    "clarity": number,
    "urgency": number,
    "toneMatch": number,
    "lengthMatch": number
  },
  "delta": number,
  "diagnosis": string,
  "recommendedEdits": string[]
}

recommendedEdits MUST be:
- concise
- actionable
- instruction-level prompt edits
- NOT a full rewritten prompt
- e.g. "Encourage booking when eligibility is confirmed"
```

### Editor Prompt (Self-Improvement)

```text
You are a prompt editor. Your job is to update a master system prompt so that future AI replies align more closely with the HUMAN consultant behavior.

You are NOT rewriting the chatbot reply.
You are ONLY editing the master system prompt.

Input:
- currentMasterPrompt: the current system prompt used by the responder
- graderOutput: includes aiScores, consultantScores, delta, diagnosis, recommendedEdits

Goal:
Reduce delta by improving behavioral alignment (proactiveness, salesIntent, empathy, clarity, urgency, toneMatch, lengthMatch).

----------------------------------------
EDITING RULES (STRICT)
----------------------------------------

1) Surgical changes only
- Prefer adding/changing a few lines over rewriting large sections.
- Preserve any sections that are not implicated by graderOutput.

2) Prioritize the biggest behavioral gaps first
- Identify the 1–3 dimensions with the largest differences between aiScores and consultantScores.
- Make edits that specifically address those gaps.

3) Use recommendedEdits as constrained guidance
- Treat recommendedEdits as suggestions, not commands.
- Apply only if they reduce the gap and do not harm other dimensions.

4) Maintain internal coherence
- The updated prompt must remain consistent (no contradictions).
- Avoid duplicating instructions or adding redundant rules.

5) Avoid prompt bloat
- Do not increase prompt length by more than ~20% unless absolutely necessary.
- If adding new instructions, consider removing or compressing weaker/duplicate lines.

6) Keep it operational, not abstract
- Prefer concrete behavioral instructions (what to do) over vague statements (be helpful).
- Use clear triggers and actions, e.g.:
  - "When eligibility is confirmed, suggest the next step (appointment / documents) in 1 sentence."
  - "Ask at most 1–2 clarifying questions when information is missing."

7) Do not introduce new product claims or facts
- Do not add specific visa facts or guarantees.
- Only adjust style/flow/behavior instructions.

----------------------------------------
OUTPUT REQUIREMENTS
----------------------------------------

Return STRICT JSON only:
{
  "updatedPrompt": string
}

The updatedPrompt must:
- be a complete valid system prompt (standalone)
- preserve good parts of currentMasterPrompt
- incorporate only the minimal changes needed to reduce delta
- not contain any JSON, markdown fences, or commentary outside the JSON object

If currentMasterPrompt is already well-aligned (delta is low), make minimal or no changes.
```
