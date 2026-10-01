import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AuthShowcaseShell from "@/components/auth/AuthShowcaseShell";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import SEO from "@/components/SEO";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error } = useAppSelector((state) => state.auth);
  const { lang, t } = useI18n();
  const sw = lang === "sw";

  const returnTo = searchParams.get("returnTo") || "/app";
  const query = searchParams.toString();

  return (
    <>
      <SEO title={sw ? "Ingia — Twende Duka" : "Sign in — Twende Duka"} description={sw ? "Ingia kwa akaunti yako ya Google." : "Sign in with your Google account."} noindex />
      <AuthShowcaseShell
        title={sw ? "Karibu Tena" : "Welcome back"}
        subtitle={sw ? "Ingia kusimamia biashara yako au kufanya manunuzi." : "Sign in to manage your business or shop."}
      >
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mb-5 flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{(t as any)(error) || error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <GoogleSignInButton onSuccess={() => navigate(returnTo, { replace: true })} />

        <p className="mt-10 text-center font-mono text-sm text-muted-foreground">
          {sw ? "Mara yako ya kwanza?" : "First time here?"} <Link className="font-bold text-primary hover:underline" to={`/register${query ? `?${query}` : ""}`}>{sw ? "Fungua akaunti" : "Create an account"}</Link>
        </p>
      </AuthShowcaseShell>
    </>
  );
}
