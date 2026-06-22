import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0a",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        background: "#161616",
        border: "1px solid #333",
        borderRadius: "12px",
        padding: "40px",
        width: "100%",
        maxWidth: "400px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎙️</div>
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    </div>
  );
}
