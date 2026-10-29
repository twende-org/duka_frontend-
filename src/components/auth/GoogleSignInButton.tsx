import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/common/Loader";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearError, loginWithGoogle } from "@/store/authSlice";
import { initGoogleSignIn, promptGoogleSignIn, type GoogleButtonStatus } from "@/lib/googleIdentity";
import { useI18n } from "@/lib/i18n";

interface GoogleSignInButtonProps {
  onSuccess: () => void;
}

type ButtonState = "loading" | GoogleButtonStatus;

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const { loading } = useAppSelector((state) => state.auth);
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;
  const [state, setState] = useState<ButtonState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    initGoogleSignIn((credential) => {
      dispatch(clearError());
      dispatch(loginWithGoogle(credential))
        .unwrap()
        .then(() => successRef.current())
        .catch(() => {});
    }).then((status) => {
      if (!cancelled) setState(status);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, dispatch]);

  const handleClick = () => {
    dispatch(clearError());
    promptGoogleSignIn();
  };

  const label = t("auth.google.signIn") || "Sign in with Google";

  return (
    <div className="space-y-3">
      {state === "ready" && (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="group relative flex w-full max-w-sm mx-auto h-11 items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white px-5 text-[#3c4043] text-sm font-medium shadow-sm transition-all duration-200 hover:border-[#d2d5d8] hover:shadow-md hover:bg-[#f8f9fa] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none dark:border-[#5f6368] dark:bg-[#2d2d2d] dark:text-[#e8eaed] dark:hover:border-[#70757a] dark:hover:bg-[#3c3c3c]"
          aria-label={label}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {loading ? (
              <Loader size={4} className="!gap-0" />
            ) : (
              <GoogleLogo className="h-5 w-5" />
            )}
          </span>
          <span>{label}</span>
        </button>
      )}

      {state === "loading" && (
        <div className="mx-auto flex h-11 w-full max-w-sm items-center justify-center gap-3 rounded-md border border-border bg-muted/50 px-5">
          <div className="h-5 w-5 animate-pulse rounded-full bg-muted-foreground/20" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      )}

      {state === "unconfigured" && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 font-mono text-xs leading-relaxed text-amber-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{t("auth.google.notConfigured")}</p>
        </div>
      )}

      {state === "unavailable" && (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 font-mono text-xs leading-relaxed text-destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{t("auth.google.loadFailed")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setAttempt((value) => value + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> {t("common.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}
