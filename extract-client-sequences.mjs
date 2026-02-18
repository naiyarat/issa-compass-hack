import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

// Example:
// node extract-client-sequences.mjs conversations.json 5 gemini-2.5-flash gemini-2.5-flash

const MASTER_PROMPT_ID = 1;
const GENERATOR_MODEL_DEFAULT = "gemini-2.5-flash";
const EDITOR_MODEL_DEFAULT = "gemini-2.5-flash";

const DEFAULT_MASTER_PROMPT_SEED = `You are a consultant at a Thailand DTV (Destination Thailand Visa) immigration services company. You handle client enquiries via direct message - quickly, warmly, and accurately.

Your role is to qualify leads, explain requirements, resolve document issues, and guide clients through the application process step by step. You do NOT make final legal determinations; you help clients understand what is needed and direct them to the app or legal team when appropriate.

TONE & STYLE
- Friendly and reassuring, but concise
- Use plain language and short messages
- Match the client's message length and energy
- Use short lists when sharing requirements

OUTPUT FORMAT
Respond ONLY with valid JSON:
{"reply":"your reply here"}`;

const PROMPT_EDITOR_SYSTEM_PROMPT = `You are an expert prompt engineer specialising in customer-facing AI chatbots. Your job is to improve an AI chatbot prompt by analysing the gap between what the AI replied and what a real human consultant actually said.

You will receive five inputs:
1. existing_prompt - the current system prompt driving the AI chatbot
2. chat_history - prior turns between client and consultant
3. client_messages - the client's latest unanswered message(s)
4. real_reply - what the actual human consultant wrote in response
5. ai_reply - what the AI chatbot produced in response

---

YOUR TASK

Step 1 - DIFF ANALYSIS
Compare real_reply and ai_reply across these dimensions:
- Content accuracy: Did the AI include wrong facts, miss required information, or hallucinate details not in the prompt?
- Content omission: Did the AI leave out something the consultant included that is important?
- Content addition: Did the AI volunteer information the consultant correctly withheld (e.g. premature pricing, unsolicited caveats)?
- Tone & register: Was the AI too formal, too casual, too long, too short, overly apologetic, or insufficiently warm?
- Structure & formatting: Did the AI use the wrong format (e.g. prose when a list was needed, or a list when one line sufficed)?
- Sequencing logic: Did the AI skip a step in the process flow, jump ahead, or fail to ask a necessary qualifying question first?
- Specificity: Did the AI give a vague answer where the consultant gave a specific one, or vice versa?

Step 2 - ROOT CAUSE INFERENCE
For each identified gap, determine the root cause:
- MISSING RULE
- AMBIGUOUS RULE
- CONFLICTING RULE
- WRONG RULE
- TONE/STYLE DRIFT

Step 3 - SURGICAL EDITS
Make the minimum set of changes to existing_prompt that would cause the AI to produce a reply closer to real_reply.

Step 4 - CHANGELOG
Before returning the updated prompt, produce a concise internal changelog listing every edit made and which root cause it addresses. This changelog is for your own reasoning only and must NOT appear in the output.

---

OUTPUT FORMAT
Return only valid JSON with a single key. The value must be the complete updated prompt as a single string, with \\n for newlines.

{"prompt":"full updated prompt text here"}`;

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function loadEnvFromDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  try {
    const raw = await readFile(envPath, "utf8");
    const parsed = parseEnvFile(raw);
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Optional .env
  }
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error(`Could not parse JSON: ${text}`);
  }
}

async function callGeminiJson({ apiKey, model, systemPrompt, userPrompt, temperature }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text ?? "")
      .join("")
      .trim() ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return tryParseJson(text);
}

async function getMasterPromptFromDb(databaseUrl) {
  const sql = postgres(databaseUrl);
  try {
    const rows = await sql`
      select prompt
      from "issacompass-hack_master_prompt"
      where id = ${MASTER_PROMPT_ID}
      limit 1
    `;
    const prompt = rows?.[0]?.prompt;
    if (!prompt || typeof prompt !== "string") return null;
    return prompt;
  } finally {
    await sql.end();
  }
}

async function upsertMasterPromptToDb(databaseUrl, prompt) {
  const sql = postgres(databaseUrl);
  try {
    const now = new Date();
    await sql`
      insert into "issacompass-hack_master_prompt" (id, prompt, "createdAt", "updatedAt")
      values (${MASTER_PROMPT_ID}, ${prompt}, ${now}, ${now})
      on conflict (id) do update set
        prompt = excluded.prompt,
        "updatedAt" = excluded."updatedAt"
    `;
  } finally {
    await sql.end();
  }
}

function extractClientSequences(conversations) {
  const extracted = [];

  for (const convo of conversations) {
    const messages = Array.isArray(convo.conversation) ? convo.conversation : [];
    let i = 0;
    let sequenceNumber = 0;

    while (i < messages.length) {
      if (messages[i]?.direction !== "in") {
        i += 1;
        continue;
      }

      const clientStart = i;
      while (i < messages.length && messages[i]?.direction === "in") i += 1;
      const clientSequence = messages.slice(clientStart, i);

      const consultantStart = i;
      while (i < messages.length && messages[i]?.direction === "out") i += 1;
      const consultantSequence = messages.slice(consultantStart, i);

      sequenceNumber += 1;
      extracted.push({
        contact_id: convo.contact_id,
        scenario: convo.scenario,
        sequence_number: sequenceNumber,
        preceding_chat_history: messages.slice(0, clientStart),
        client_sequence: clientSequence,
        consultant_sequence_reply: consultantSequence,
      });
    }
  }

  return extracted;
}

function buildGenerationUserPrompt(item) {
  return [
    "Generate the consultant reply for this conversation turn.",
    'Return ONLY JSON in this shape: {"reply":"..."}',
    "",
    `CONTACT_ID: ${item.contact_id}`,
    `SCENARIO: ${item.scenario}`,
    "",
    "PRECEDING_CHAT_HISTORY:",
    JSON.stringify(item.preceding_chat_history, null, 2),
    "",
    "CLIENT_SEQUENCE:",
    JSON.stringify(item.client_sequence, null, 2),
  ].join("\n");
}

function toMessageText(messages) {
  return messages
    .map((m) => `[${m.direction}] ${String(m.text ?? "").trim()}`)
    .join("\n");
}

async function generateReplyWithGemini({ apiKey, model, systemPrompt, item }) {
  return callGeminiJson({
    apiKey,
    model,
    systemPrompt,
    userPrompt: buildGenerationUserPrompt(item),
    temperature: 0.3,
  });
}

async function editPromptWithGemini({
  apiKey,
  model,
  existingPrompt,
  chatHistory,
  clientMessages,
  realReply,
  aiReply,
}) {
  const editorInput = JSON.stringify(
    {
      existing_prompt: existingPrompt,
      chat_history: chatHistory,
      client_messages: clientMessages,
      real_reply: realReply,
      ai_reply: aiReply,
    },
    null,
    2
  );

  const result = await callGeminiJson({
    apiKey,
    model,
    systemPrompt: PROMPT_EDITOR_SYSTEM_PROMPT,
    userPrompt: editorInput,
    temperature: 0.2,
  });

  if (!result?.prompt || typeof result.prompt !== "string") {
    throw new Error(`Editor response missing "prompt": ${JSON.stringify(result)}`);
  }
  return result.prompt;
}

async function main() {
  const fileArg = process.argv[2] ?? "conversations.json";
  const sampleCount = Number.parseInt(process.argv[3] ?? "5", 10);
  const generatorModel = process.argv[4] ?? GENERATOR_MODEL_DEFAULT;
  const editorModel = process.argv[5] ?? EDITOR_MODEL_DEFAULT;
  const filePath = path.resolve(process.cwd(), fileArg);

  await loadEnvFromDotEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");
  if (!databaseUrl) throw new Error("Missing DATABASE_URL.");

  const raw = await readFile(filePath, "utf8");
  const conversations = JSON.parse(raw);
  if (!Array.isArray(conversations)) {
    throw new Error("Input JSON must be an array of conversation objects.");
  }

  const extracted = extractClientSequences(conversations);
  const eligible = extracted.filter(
    (item) => Array.isArray(item.consultant_sequence_reply) && item.consultant_sequence_reply.length > 0
  );
  const sample = eligible.slice(0, Math.max(0, sampleCount));

  let currentPrompt = await getMasterPromptFromDb(databaseUrl);
  const seededFromDefault = !currentPrompt;
  if (!currentPrompt) {
    currentPrompt = DEFAULT_MASTER_PROMPT_SEED;
    await upsertMasterPromptToDb(databaseUrl, currentPrompt);
  }

  console.log(`Input conversations: ${conversations.length}`);
  console.log(`Extracted client sequences: ${extracted.length}`);
  console.log(`Editor sample size: ${sample.length}`);
  console.log(`Generator model: ${generatorModel}`);
  console.log(`Editor model: ${editorModel}`);
  console.log(`Seeded DB prompt from default: ${seededFromDefault}`);

  const before = [];
  let optimizedPrompt = currentPrompt;

  for (const item of sample) {
    const aiBefore = await generateReplyWithGemini({
      apiKey,
      model: generatorModel,
      systemPrompt: optimizedPrompt,
      item,
    });

    const realReply = toMessageText(item.consultant_sequence_reply);
    const aiReply =
      typeof aiBefore?.reply === "string" ? aiBefore.reply : JSON.stringify(aiBefore);

    optimizedPrompt = await editPromptWithGemini({
      apiKey,
      model: editorModel,
      existingPrompt: optimizedPrompt,
      chatHistory: toMessageText(item.preceding_chat_history),
      clientMessages: toMessageText(item.client_sequence),
      realReply,
      aiReply,
    });

    before.push({
      contact_id: item.contact_id,
      sequence_number: item.sequence_number,
      ai_reply_before_update: aiBefore,
      expected_consultant_sequence_reply: item.consultant_sequence_reply,
    });
  }

  await upsertMasterPromptToDb(databaseUrl, optimizedPrompt);
  const updatedDbPrompt = await getMasterPromptFromDb(databaseUrl);
  if (!updatedDbPrompt) throw new Error("Failed to read updated DB prompt.");

  const after = [];
  for (const item of sample) {
    const aiAfter = await generateReplyWithGemini({
      apiKey,
      model: generatorModel,
      systemPrompt: updatedDbPrompt,
      item,
    });
    after.push({
      contact_id: item.contact_id,
      sequence_number: item.sequence_number,
      ai_reply_after_update: aiAfter,
      expected_consultant_sequence_reply: item.consultant_sequence_reply,
    });
  }

  console.log(
    JSON.stringify(
      {
        prompt_update: {
          seeded_from_default: seededFromDefault,
          previous_prompt_length: currentPrompt.length,
          updated_prompt_length: updatedDbPrompt.length,
        },
        before,
        after,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Failed to run prompt optimization pipeline:", error);
  process.exit(1);
});
