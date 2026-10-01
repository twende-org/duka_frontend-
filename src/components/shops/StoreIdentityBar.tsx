import { MapPin, Star, ShieldCheck, Heart, Package } from "lucide-react";
import { BsWhatsapp } from "react-icons/bs";
import { Button } from "@/components/ui/button";

interface StoreIdentityBarProps {
  location?: string;
  productCount: number;
  rating?: number;
  reviewCount?: number;
  followerCount: number;
  isFollowing: boolean;
  onFollow: () => void;
  onContact: () => void;
  extraActions?: React.ReactNode;
}

export default function StoreIdentityBar({
  location,
  productCount,
  rating,
  reviewCount,
  followerCount,
  isFollowing,
  onFollow,
  onContact,
  extraActions,
}: StoreIdentityBarProps) {
  const chip = "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur";

  return (
    <div className="flex flex-col gap-4 pt-11 sm:pt-14 md:flex-row md:items-center md:justify-between md:gap-6 md:pt-5 md:pl-40">
      {/* Meta chips — horizontally scrollable on mobile */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        <span className={chip}>
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="font-bold text-foreground">{rating ? rating.toFixed(1) : "New"}</span>
          {typeof reviewCount === "number" && reviewCount > 0 && <span>({reviewCount})</span>}
        </span>
        <span className={chip}>
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[150px] truncate">{location || "Tanzania"}</span>
        </span>
        <span className={chip}>
          <Package className="h-3.5 w-3.5 text-primary" />
          <span className="font-bold text-foreground">{productCount}</span> products
        </span>
        <span className={chip}>
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Verified
        </span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 items-center gap-2 md:flex md:shrink-0 md:grid-cols-none">
        <Button onClick={onContact} className="h-11 rounded-xl font-semibold shadow-sm md:h-10">
          <BsWhatsapp className="mr-2 h-4 w-4" /> Contact
        </Button>
        <Button
          variant={isFollowing ? "secondary" : "outline"}
          onClick={onFollow}
          className="h-11 rounded-xl font-semibold md:h-10"
        >
          <Heart className={`mr-2 h-4 w-4 ${isFollowing ? "fill-primary text-primary" : ""}`} />
          {isFollowing ? "Following" : "Follow"}
          <span className="ml-1.5 text-xs text-muted-foreground">{followerCount.toLocaleString()}</span>
        </Button>
        {extraActions && <div className="col-span-2 [&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl md:[&_button]:h-10">{extraActions}</div>}
      </div>
    </div>
  );
}
