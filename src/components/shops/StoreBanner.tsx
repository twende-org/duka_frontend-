import { Store, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";

interface StoreBannerProps {
  name: string;
  coverImage?: string;
  logoUrl?: string;
  eyebrow?: string;
}

export default function StoreBanner({ name, coverImage, logoUrl, eyebrow }: StoreBannerProps) {
  return (
    <section className="relative">
      <div className="relative h-[210px] xs:h-[240px] sm:h-[300px] md:h-[380px] w-full overflow-hidden rounded-b-[1.75rem] sm:rounded-[2rem] bg-muted">
        {coverImage ? (
          <motion.img
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.21, 0.45, 0.32, 0.9] }}
            src={coverImage}
            alt={`${name} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/25 via-primary/5 to-background">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <Store className="relative h-20 w-20 text-primary/25" />
          </div>
        )}

        {/* Depth layers */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgba(0,0,0,0.55),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 rounded-b-[1.75rem] sm:rounded-[2rem] ring-1 ring-inset ring-white/10" />

        <div className="absolute inset-x-0 bottom-0 p-4 pb-5 sm:p-6 sm:pb-7 md:pl-52 md:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-[calc(100%-5.5rem)] md:max-w-none"
          >
            {eyebrow && (
              <span className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md sm:text-[10px]">
                <span className="truncate">{eyebrow}</span>
              </span>
            )}
            <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight text-white drop-shadow-md sm:text-3xl md:text-[2.6rem] line-clamp-2">
              {name}
            </h1>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="absolute right-4 -bottom-7 sm:right-auto sm:left-6 sm:-bottom-8 md:-bottom-7"
      >
        <div className="relative h-[4.5rem] w-[4.5rem] sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-2xl sm:rounded-[1.75rem] bg-card p-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] ring-1 ring-border/60">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl sm:rounded-[1.4rem] bg-muted">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-7 w-7 text-muted-foreground/40 sm:h-9 sm:w-9" />
            )}
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background sm:h-7 sm:w-7">
            <BadgeCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        </div>
      </motion.div>
    </section>
  );
}
