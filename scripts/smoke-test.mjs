// SMOKE-01: throwaway script to prove the Anthropic key, SDK, and model name work.
// Delete this file once it passes. Never log the key's value, only presence/absence.
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.MARKING_MODEL;

if (!apiKey) {
  console.error("ANTHROPIC_API_KEY is not set. Add it to .env.");
  process.exit(1);
}

if (!model) {
  console.error("MARKING_MODEL is not set. Add it to .env.");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey });

try {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 50,
    messages: [{ role: "user", content: "Say hello in exactly five words." }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  console.log("Model replied:", text);
} catch (error) {
  console.error("Call to Anthropic failed:", error.message);
  process.exit(1);
}
