import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Read environment variables from the runtime. Use when the user asks for GitHub username, Slack channel, or other configuration that should be set as env vars. Returns the values of the requested env vars.",
  inputSchema: z.object({
    keys: z
      .array(z.string())
      .describe("List of environment variable names to read, e.g. ['GITHUB_USERNAME', 'SLACK_CHANNEL_ID']"),
  }),
  async execute({ keys }) {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = process.env[key] || "(not set)";
    }
    return result;
  },
});
