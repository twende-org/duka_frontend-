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

  return (
    <div className="space-y-3">
      {state === "ready" && (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="group mx-auto flex h-16 w-16 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Sign in with Google"
        >
          <svg viewBox="0 0 24 24" className="h-12 w-12 drop-shadow-md transition-all group-hover:drop-shadow-lg" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </button>
      )}

      {state === "ready" && loading && (
        <div className="flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader size={5} className="!gap-0" /> <span>{t("common.loading")}</span>
        </div>
      )}

      {state === "loading" && <div aria-hidden="true" className="mx-auto h-16 w-16 animate-pulse rounded-full bg-muted" />}

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
