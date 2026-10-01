import { useMemo } from "react";
import { MapPin, Navigation } from "lucide-react";

interface ShopMapProps {
  location: string;
  shopName?: string;
  lat?: number;
  lon?: number;
  className?: string;
  compact?: boolean;
  showActions?: boolean;
}

export default function ShopMap({
  location,
  shopName,
  lat,
  lon,
  className = "",
  compact = false,
  showActions = true,
}: ShopMapProps) {
  const locationQuery = useMemo(
    () => `${location}${shopName ? ` ${shopName}` : ""}`.trim(),
    [location, shopName],
  );

  const hasCoords = typeof lat === "number" && typeof lon === "number";

  const mapEmbedSrc = useMemo(() => {
    const q = hasCoords ? `${lat},${lon}` : encodeURIComponent(locationQuery);
    return `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
  }, [hasCoords, lat, lon, locationQuery]);

  const destination = hasCoords ? `${lat},${lon}` : locationQuery;

  // Opens Google Maps directly in navigation/driving mode
  const directionsLink = useMemo(
    () =>
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`,
    [destination],
  );

  const mapTitle = `Ramani${shopName ? ` - ${shopName}` : ""}`;

  if (compact) {
    return (
      <div className={`overflow-hidden rounded-xl border bg-card ${className}`}>
        <div className="relative h-full min-h-[120px]">
          <iframe
            src={mapEmbedSrc}
            title={mapTitle}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-background/70 to-transparent" />
          <div className="pointer-events-none absolute left-2 top-2 inline-flex max-w-[80%] items-center gap-1 rounded-full border border-border/50 bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-sm">
            <MapPin className="h-3 w-3 shrink-0 text-primary" />
            <span className="truncate">{shopName || location}</span>
          </div>

          {showActions && (
            <div className="absolute bottom-2 right-2">
              <a
                href={directionsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
              >
                <Navigation className="h-3 w-3" /> Ongozwa
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border bg-card ${className}`}>
      {/* Embedded Map */}
      <div className="relative h-56 border-b bg-muted">
        <iframe
          src={mapEmbedSrc}
          title={mapTitle}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Info & Navigation */}
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground">{shopName || "Duka"}</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span className="truncate">{location}</span>
            </p>
            {hasCoords && (
              <p className="mt-1 text-xs text-muted-foreground/70">
                {lat!.toFixed(5)}, {lon!.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Bonyeza "Ongozwa" kufungua Google Maps moja kwa moja kwenye hali ya kuongoza njia.
        </p>

        {showActions && (
          <a
            href={directionsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Navigation className="h-4 w-4" /> Ongozwa hadi Dukani
          </a>
        )}
      </div>
    </div>
  );
}
