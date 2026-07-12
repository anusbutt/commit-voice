import { openrouter } from "@openrouter/ai-sdk-provider";
import { defineAgent } from "eve";

export default defineAgent({
  model: openrouter("google/gemini-2.5-flash-lite"),
  modelContextWindowTokens: 1000000,
});
