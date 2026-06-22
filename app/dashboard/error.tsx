"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "system-ui", textAlign: "center" }}>
      <h2>Something went wrong</h2>
      <p style={{ color: "#888", margin: "1rem 0" }}>{error.message}</p>
      <button onClick={reset} style={{ background: "#3b82f6", color: "#fff" }}>
        Try again
      </button>
    </main>
  );
}
