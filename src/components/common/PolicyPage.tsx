import { useState } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import Logo from "@/components/common/Logo";

export interface PolicySection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface PolicyContent {
  pageTitle: string;
  updated: string;
  intro: string;
  sections: PolicySection[];
  footer: string;
}

export interface PolicyPageProps {
  copy: { en: PolicyContent; sw: PolicyContent };
  canonical: string;
  metaTitle: string;
  metaDescription: string;
}

export default function PolicyPage({ copy, canonical, metaTitle, metaDescription }: PolicyPageProps) {
  const [lang, setLang] = useState<"en" | "sw">("en");
  const content = copy[lang];

  return (
    <div className="min-h-screen bg-background">
      <SEO title={metaTitle} description={metaDescription} canonical={canonical} />

      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Logo size={22} className="text-primary" />
            </div>
            <span className="text-xl font-extrabold text-foreground">Twende Duka</span>
          </Link>
          <div className="flex items-center gap-1 rounded-full border border-border/50 bg-card p-1 text-xs font-semibold">
            {(["en", "sw"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {l === "en" ? "English" : "Kiswahili"}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{content.pageTitle}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{content.updated}</p>
        <p className="mt-6 leading-relaxed text-muted-foreground">{content.intro}</p>

        <div className="mt-10 space-y-9">
          {content.sections.map((section, index) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-foreground">
                {index + 1}. {section.title}
              </h2>
              {section.paragraphs?.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className="mt-14 border-t pt-6 text-sm text-muted-foreground">{content.footer}</p>
      </main>
    </div>
  );
}
