import { TwitterApi } from "twitter-api-v2";

export async function postToTwitter(
  text: string
): Promise<{ success: boolean; tweetId?: string; url?: string; error?: string }> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return {
      success: false,
      error:
        "Twitter API credentials not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET.",
    };
  }

  try {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken,
      accessSecret,
    });

    const tweet = await client.v2.tweet(text);
    return {
      success: true,
      tweetId: tweet.data.id,
      url: `https://twitter.com/i/status/${tweet.data.id}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown Twitter error" };
  }
}

export async function postToLinkedin(
  text: string
): Promise<{ success: boolean; error?: string }> {
  const personId = process.env.LINKEDIN_PERSON_ID;
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!personId || !accessToken) {
    return {
      success: false,
      error:
        "LinkedIn credentials not configured. Set LINKEDIN_PERSON_ID and LINKEDIN_ACCESS_TOKEN.",
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
    return { success: false, error: err.message || "Unknown LinkedIn error" };
  }
}
