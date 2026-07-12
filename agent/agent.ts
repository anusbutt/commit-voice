import { openrouter } from "@openrouter/ai-sdk-provider";
import { defineAgent } from "eve";

export default defineAgent({
  model: openrouter("deepseek/deepseek-v4-flash"),
  modelContextWindowTokens: 1000000,
});
