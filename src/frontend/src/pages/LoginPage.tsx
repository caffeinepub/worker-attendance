import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { HardHat, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) {
      navigate({ to: "/dashboard" });
    }
  }, [identity, navigate]);

  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 page-enter">
        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30">
            <HardHat className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
              Worker Attendance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Attendance management for field teams
            </p>
          </div>
        </div>

        {/* Sign In Card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Use your secure identity to access the app.
            </p>
          </div>

          <Button
            data-ocid="login.primary_button"
            className="w-full h-12 text-base font-semibold"
            onClick={() => login()}
            disabled={isLoggingIn || isInitializing}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            New users are registered automatically on first sign in. The first
            registered user becomes the Admin.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
