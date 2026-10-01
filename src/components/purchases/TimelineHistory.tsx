import { CheckCircle2, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { B2BTimelineEvent } from "@/types";

export function TimelineHistory({ events }: { events?: B2BTimelineEvent[] }) {
  const { t } = useI18n();

  if (!events || events.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <h4 className="text-sm font-bold text-foreground mb-4">{t("purchases.timelineHistory")}</h4>
      <div className="space-y-4 pl-2">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          let dateStr = t("purchases.unknownDate");
          if (event.timestamp) {
            if (typeof event.timestamp === "object" && 'toDate' in event.timestamp) {
              dateStr = event.timestamp.toDate().toLocaleString();
            } else {
              dateStr = new Date(event.timestamp as string).toLocaleString();
            }
          }

          return (
            <div key={index} className="relative flex gap-4">
              {!isLast && (
                <div className="absolute left-2.5 top-6 bottom-[-16px] w-px bg-border"></div>
              )}
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col pb-1">
                <span className="text-sm font-medium text-foreground">{event.description}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {dateStr}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
