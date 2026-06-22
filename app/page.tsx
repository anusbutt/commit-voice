import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Commit Voice</h1>
      <p>AI agent that turns your GitHub commits into social media posts.</p>
      <Link href="/dashboard" style={{ color: "#0070f3", textDecoration: "underline" }}>
        Go to Dashboard →
      </Link>
    </main>
  );
}
