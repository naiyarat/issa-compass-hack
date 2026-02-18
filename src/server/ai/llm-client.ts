import { env } from "@/env";

// type RoleProvider = "google" | "groq" | "deepseek";
type LlmRole = "responder" | "grader" | "editor";

type GenerateInput = {
  role: LlmRole;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
};

type GenerateJsonInput = GenerateInput & {
  schemaHint?: string;
};

// const roleProviderMap: Record<LlmRole, RoleProvider> = {
//   responder: "google",
//   grader: "groq",
//   editor: "deepseek",
// };

const defaultModelByRole: Record<LlmRole, string> = {
  responder: env.RESPONDER_MODEL,
  grader: env.GRADER_MODEL,
  editor: env.EDITOR_MODEL,
};

const defaultMaxTokensByRole: Record<LlmRole, number> = {
  responder: 10000,
  grader: 10000,
  editor: 10000,
};

function parseJsonStrict<T>(rawText: string): T {
  return JSON.parse(rawText) as T;
}

function parseJsonWithFenceFallback<T>(rawText: string): T {
  try {
    return parseJsonStrict<T>(rawText);
  } catch {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return parseJsonStrict<T>(rawText.slice(start, end + 1));
    }
    throw new Error("INVALID_JSON_RESPONSE");
  }
}

async function callGoogleGenerateText(input: GenerateInput): Promise<string> {
  const apiKey = env.GOOGLE_API_KEY;
  const model = defaultModelByRole[input.role];
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey,
  )}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: input.systemPrompt }],
      },
      contents: [{ role: "user", parts: [{ text: input.userPrompt }] }],
      generationConfig: {
        temperature: input.temperature ?? 0.2,
        maxOutputTokens:
          input.maxTokens ?? defaultMaxTokensByRole[input.role] ?? 1200,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (
      response.status === 429 ||
      errorBody.toLowerCase().includes("resource_exhausted") ||
      errorBody.toLowerCase().includes("quota exceeded")
    ) {
      throw new Error("LLM_PROVIDER_QUOTA_EXCEEDED");
    }
    throw new Error("LLM_PROVIDER_REQUEST_FAILED");
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) throw new Error("EMPTY_LLM_RESPONSE");
  return text;
}

// not enough tokens to test, so using gemini instead
// async function callOpenAiCompatibleGenerateText(
//   baseUrl: string,
//   apiKey: string,
//   input: GenerateInput,
// ): Promise<string> {
//   const model = defaultModelByRole[input.role];
//   const provider = baseUrl.includes("groq") ? "groq" : "deepseek";

//   const response = await fetch(`${baseUrl}/chat/completions`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${apiKey}`,
//     },
//     body: JSON.stringify({
//       model,
//       temperature: input.temperature ?? 0.2,
//       max_tokens:
//         input.maxTokens ?? defaultMaxTokensByRole[input.role] ?? 10000,
//       messages: [
//         { role: "system", content: input.systemPrompt },
//         { role: "user", content: input.userPrompt },
//       ],
//     }),
//   });

//   if (!response.ok) {
//     const errorBody = await response.text().catch(() => "");
//     if (
//       provider === "deepseek" &&
//       response.status === 402 &&
//       errorBody.toLowerCase().includes("insufficient balance")
//     ) {
//       throw new Error("DEEPSEEK_INSUFFICIENT_BALANCE");
//     }
//     if (
//       response.status === 429 ||
//       errorBody.toLowerCase().includes("resource_exhausted") ||
//       errorBody.toLowerCase().includes("quota exceeded")
//     ) {
//       throw new Error("LLM_PROVIDER_QUOTA_EXCEEDED");
//     }
//     throw new Error("LLM_PROVIDER_REQUEST_FAILED");
//   }

//   const payload = (await response.json()) as {
//     choices?: Array<{ message?: { content?: string } }>;
//   };

//   const text = payload.choices?.[0]?.message?.content?.trim();
//   if (!text) throw new Error("EMPTY_LLM_RESPONSE");
//   return text;
// }

// not enough tokens to test, so using gemini for everything instead
async function generateByRole(input: GenerateInput): Promise<string> {
  // const provider = roleProviderMap[input.role];

  return callGoogleGenerateText(input);
}

export const llmClient = {
  async generateText(input: GenerateInput): Promise<string> {
    return generateByRole(input);
  },

  async generateJsonStrict<T>(input: GenerateJsonInput): Promise<T> {
    const basePrompt = `${input.userPrompt}\n\nReturn strict JSON only.`;

    const firstPass = await generateByRole({
      ...input,
      userPrompt: basePrompt,
    });

    try {
      return parseJsonWithFenceFallback<T>(firstPass);
    } catch {
      // Retry once with targeted repair instruction.
      const repairPrompt = [
        "Convert the following content into valid JSON only.",
        "Do not add explanations.",
        input.schemaHint ? `Schema hint:\n${input.schemaHint}` : "",
        "Content to repair:",
        firstPass,
      ]
        .filter(Boolean)
        .join("\n\n");

      const repaired = await generateByRole({
        ...input,
        userPrompt: repairPrompt,
        temperature: 0,
      });

      return parseJsonWithFenceFallback<T>(repaired);
    }
  },
};
