import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Post an update to LinkedIn. Use when the user approves a LinkedIn post or when auto-posting is enabled. The post will be published to the authenticated user's LinkedIn profile.",
  inputSchema: z.object({
    text: z.string().max(3000).describe("LinkedIn post text (max 3000 characters)"),
  }),
  async execute({ text }) {
    const personId = process.env.LINKEDIN_PERSON_ID;
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

    if (!personId || !accessToken) {
      return {
        success: false,
        error: "LinkedIn credentials not configured. Set LINKEDIN_PERSON_ID and LINKEDIN_ACCESS_TOKEN env vars.",
      };
    }

    try {
      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${personId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: `LinkedIn API error: ${err.message || "Unknown error"}`,
      };
    }
  },
});
