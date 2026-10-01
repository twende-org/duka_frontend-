import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AuthShowcaseShell from "@/components/auth/AuthShowcaseShell";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import SEO from "@/components/SEO";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { error } = useAppSelector((state) => state.auth);
  const { lang, t } = useI18n();
  const sw = lang === "sw";

  const returnTo = searchParams.get("returnTo") || "/app";
  const query = searchParams.toString();

  const benefits = sw
    ? ["Akaunti moja kwa biashara na ununuzi", "Chagua eneo lako baada ya kuingia", "Kuingia salama kwa akaunti yako ya Google"]
    : ["One account for business and shopping", "Choose your workspace after sign-in", "Secure sign-in with your Google account"];

  return (
    <>
      <SEO title={sw ? "Jisajili — Twende Duka" : "Join — Twende Duka"} description={sw ? "Fungua akaunti ya Twende Duka kwa Google." : "Create your Twende Duka account with Google."} noindex />
      <AuthShowcaseShell
        title={sw ? "Anza na Twende Duka" : "Join Twende Duka"}
        subtitle={sw ? "Fungua akaunti, kisha uchague kama unataka kununua au kusimamia biashara." : "Create your account, then choose whether to shop or manage a business."}
      >
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mb-5 flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{(t as any)(error) || error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <ul className="mb-7 space-y-3">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" /> {benefit}
            </li>
          ))}
        </ul>

        <GoogleSignInButton onSuccess={() => navigate(returnTo, { replace: true })} />

        <p className="mt-10 text-center font-mono text-sm text-muted-foreground">
          {sw ? "Tayari una akaunti?" : "Already have an account?"} <Link className="font-bold text-primary hover:underline" to={`/login${query ? `?${query}` : ""}`}>{sw ? "Ingia" : "Sign in"}</Link>
        </p>
      </AuthShowcaseShell>
    </>
  );
}
