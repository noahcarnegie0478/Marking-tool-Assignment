import Anthropic from "@anthropic-ai/sdk";

// The only file in this project that touches the Anthropic SDK or the
// API key. Nothing else should import "@anthropic-ai/sdk" directly.

// The reply is one short JSON object (a short reasoning, a mark, one or
// two sentences of feedback, and a boolean). 1024 tokens leaves room for
// the reasoning field (was 500) without allowing a long, costly reply.
const MAX_REPLY_TOKENS = 1024;

// One client per server process, built lazily so importing this module
// never fails (useful in tests that mock this file entirely and never
// construct a real client).
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) {
    return client;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  client = new Anthropic({ apiKey });
  return client;
}

// Sends one prompt to the marking model and returns its text reply.
// Throws on a missing env var or an API failure; the caller
// (gradeResponse) turns that into a safe fallback instead of a crash.
export async function callMarkingModel(prompt: string): Promise<string> {
  const model = process.env.MARKING_MODEL;
  if (!model) {
    throw new Error("MARKING_MODEL is not set.");
  }

  const message = await getClient().messages.create({
    model,
    max_tokens: MAX_REPLY_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find(block => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model reply had no text content.");
  }

  return textBlock.text;
}
