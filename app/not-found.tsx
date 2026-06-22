import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "2rem", fontFamily: "system-ui", textAlign: "center" }}>
      <h1>404 — Page Not Found</h1>
      <p style={{ color: "#888", margin: "1rem 0" }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" style={{ color: "#3b82f6" }}>
        ← Back to Home
      </Link>
    </main>
  );
}
