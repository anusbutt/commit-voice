import { defineTool } from "eve/tools";
import { z } from "zod";
import { TwitterApi } from "twitter-api-v2";

export default defineTool({
  description:
    "Post a tweet to X/Twitter. Use when the user approves a Twitter post or when auto-posting is enabled. The tweet will be published to the authenticated user's X/Twitter account.",
  inputSchema: z.object({
    text: z.string().max(280).describe("Tweet text content (max 280 characters)"),
  }),
  async execute({ text }) {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      return {
        success: false,
        error: "Twitter API credentials not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET env vars.",
      };
    }

    try {
      const client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
      });

      const tweet = await client.v2.tweet(text);

      return {
        success: true,
        tweetId: tweet.data.id,
        url: `https://twitter.com/i/status/${tweet.data.id}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Twitter API error: ${err.message || "Unknown error"}`,
      };
    }
  },
});
