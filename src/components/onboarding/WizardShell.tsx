import React from "react";
import { motion } from "framer-motion";
import { Check, Store, ChevronLeft, ChevronRight, Lightbulb, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Loader } from "@/components/common/Loader";
import { STEP_META, type StepMeta } from "./stepMeta";

interface WizardShellProps {
  step: number;
  totalSteps: number;
  stepMeta?: StepMeta[];
  shopName?: string;
  submitting?: boolean;
  submitLabel?: { en: string; sw: string };
  secondaryAction?: React.ReactNode;
  onStepSelect: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
}

export default function WizardShell({
  step,
  totalSteps,
  stepMeta = STEP_META,
  shopName,
  submitting,
  submitLabel,
  secondaryAction,
  onStepSelect,
  onBack,
  onNext,
  onSubmit,
  onCancel,
  children,
}: WizardShellProps) {
  const { lang } = useI18n();
  const meta = stepMeta[step - 1];
  const L = (v: { en: string; sw: string }) => (lang === "sw" ? v.sw : v.en);
  const isLast = step === totalSteps;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-border bg-card shadow-xl md:min-h-[400px] md:max-h-[80vh] md:flex-row">
        {/* Left context pane */}
        <aside className="relative w-full shrink-0 border-b border-border bg-card p-4 md:w-[220px] md:border-b-0 md:border-r md:p-6">
            <div className="flex items-center gap-3">
              {onCancel && (
                <Button variant="outline" size="icon" className="rounded-full h-8 w-8 shrink-0" onClick={onCancel} title={lang === "sw" ? "Ghairi" : "Cancel"}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <span className="truncate text-base font-bold text-foreground">
                {shopName?.trim() || (lang === "sw" ? "Duka Lako" : "Your Shop")}
              </span>
            </div>

            <div className="mt-8 hidden md:block">
              <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {lang === "sw" ? `Hatua ${step}` : `Step ${step}`}
                </p>
                <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground">{L(meta.title)}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{L(meta.helper)}</p>

                <div className="my-6 border-t border-dashed border-border" />

                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  {lang === "sw" ? "Je, ulijua?" : "Did you know?"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{L(meta.tip)}</p>
              </motion.div>

              <p className="mt-8 text-sm text-muted-foreground">
                {lang === "sw" ? "Una swali?" : "Questions?"}{" "}
                <a
                  href="https://wa.me/255000000000"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                >
                  <LifeBuoy className="h-3.5 w-3.5" />
                  {lang === "sw" ? "Wasiliana nasi." : "Contact support."}
                </a>
              </p>
            </div>

            {/* Mobile compact progress */}
            <div className="mt-4 flex items-center gap-2 md:hidden">
              {stepMeta.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => s.id < step && onStepSelect(s.id)}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    s.id <= step ? "bg-primary" : "bg-muted"
                  )}
                  aria-label={L(s.title)}
                />
              ))}
            </div>
            <p className="mt-3 text-sm font-bold text-foreground md:hidden">
              {lang === "sw" ? `Hatua ${step}/${totalSteps}` : `Step ${step}/${totalSteps}`} · {L(meta.title)}
            </p>
          </aside>

          {/* Vertical step rail */}
          <div className="relative hidden w-16 shrink-0 justify-center md:flex">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
            <motion.div
              className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-primary"
              initial={false}
              animate={{ height: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              transition={{ type: "spring", stiffness: 180, damping: 26 }}
            />
            <div className="relative flex h-full flex-col items-center justify-center gap-8 py-10">
              {stepMeta.map((s) => {
                const done = s.id < step;
                const active = s.id === step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!done}
                    onClick={() => onStepSelect(s.id)}
                    title={L(s.title)}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                      done && "border-primary bg-primary text-primary-foreground cursor-pointer",
                      active && "border-primary bg-card text-primary",
                      !done && !active && "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="wizard-active-ring"
                        className="absolute -inset-1 rounded-full ring-2 ring-primary/40"
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      />
                    )}
                    {done ? <Check className="h-4 w-4" /> : s.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right question pane */}
          <section className="flex min-w-0 flex-1 flex-col bg-muted/30">
            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
              <motion.h1
                key={`q-${step}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="max-w-2xl text-2xl font-black leading-tight tracking-tight text-foreground md:text-3xl"
              >
                {L(meta.question)}
              </motion.h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:hidden">{L(meta.helper)}</p>

              <div className="mt-8">{children}</div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-card/90 p-4 backdrop-blur md:px-10">
              <Button
                variant="ghost"
                size="lg"
                onClick={onBack}
                disabled={step === 1 || submitting}
                className={cn(step === 1 && "invisible")}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {lang === "sw" ? "Rudi" : "Back"}
              </Button>

              {!isLast ? (
                <Button size="lg" onClick={onNext} disabled={submitting} className="min-w-[10rem]">
                  {submitting ? (
                    <Loader size={6} className="!gap-0" />
                  ) : (
                    <>
                      {lang === "sw" ? "Endelea" : "Next Step"}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {secondaryAction}
                  <Button size="lg" onClick={onSubmit} disabled={submitting} className="min-w-[10rem]">
                    {submitting ? (
                      <Loader size={6} className="!gap-0" />
                    ) : (
                      L(submitLabel ?? { en: "Create Shop", sw: "Sajili Duka" })
                    )}
                  </Button>
                </div>
              )}
            </div>
          </section>
      </div>
    </div>
  );
}
