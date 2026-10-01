import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/common/Loader";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearError, loginWithGoogle } from "@/store/authSlice";
import { renderGoogleButton, type GoogleButtonStatus } from "@/lib/googleIdentity";
import { useI18n } from "@/lib/i18n";

interface GoogleSignInButtonProps {
  onSuccess: () => void;
}

type ButtonState = "loading" | GoogleButtonStatus;

/**
 * Google's official GIS button plus its fallback states. Google sign-in is the
 * only way in, so an unavailable button always explains itself instead of
 * leaving an empty panel.
 */
export default function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const { loading } = useAppSelector((state) => state.auth);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;
  const [state, setState] = useState<ButtonState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    setState("loading");

    renderGoogleButton(container, (credential) => {
      dispatch(clearError());
      dispatch(loginWithGoogle(credential))
        .unwrap()
        .then(() => successRef.current())
        .catch(() => {
          // Redux exposes a localized error state in the surrounding panel.
        });
    }).then((status) => {
      if (!cancelled) setState(status);
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, dispatch]);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        data-testid="google-signin-container"
        className={state === "ready" ? "flex justify-center" : "hidden"}
      />

      {state === "loading" && <div aria-hidden="true" className="h-11 w-full animate-pulse rounded-xl bg-muted" />}

      {state === "ready" && loading && (
        <div className="flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader size={5} className="!gap-0" /> <span>{t("common.loading")}</span>
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
