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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-2xl p-10 w-full max-w-[400px] text-center">
        <div className="text-4xl mb-3">🎙️</div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
