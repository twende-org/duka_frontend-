import { useEffect, useState } from "react";
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { fetchActiveAnnouncement, type Announcement } from "@/lib/api/domains/announcements";
import { cn } from "@/lib/utils";

const typeConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    btnHover: "hover:bg-blue-100 dark:hover:bg-blue-900/50",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    btnHover: "hover:bg-amber-100 dark:hover:bg-amber-900/50",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
    text: "text-green-800 dark:text-green-200",
    btnHover: "hover:bg-green-100 dark:hover:bg-green-900/50",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    btnHover: "hover:bg-red-100 dark:hover:bg-red-900/50",
  },
};

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchActiveAnnouncement();
        if (!data) return;
        // Check if this specific announcement was dismissed
        const key = `announcement_dismissed_${data.id}`;
        if (!sessionStorage.getItem(key)) {
          setAnnouncement(data);
        }
      } catch {
        // Silent fail — never block the app
      }
    };
    load();
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      sessionStorage.setItem(`announcement_dismissed_${announcement.id}`, "1");
    }
    setDismissed(true);
  };

  if (!announcement || dismissed) return null;

  const cfg = typeConfig[announcement.type] || typeConfig.info;
  const Icon = cfg.icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 mb-4 animate-in slide-in-from-top-2 duration-300", cfg.bg)}>
      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", cfg.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm", cfg.text)}>{announcement.title}</p>
        <p className={cn("text-sm mt-0.5 leading-relaxed", cfg.text, "opacity-90")}>{announcement.message}</p>
      </div>
      <button
        onClick={handleDismiss}
        className={cn("rounded-lg p-1 transition-colors shrink-0", cfg.btnHover)}
      >
        <X className={cn("h-4 w-4", cfg.text)} />
      </button>
    </div>
  );
}
