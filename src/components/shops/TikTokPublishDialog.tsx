import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Share2, CheckCircle2, XCircle, Video, Image as ImageIcon, AlertCircle, RefreshCw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TikTokIcon } from "@/components/shops/TikTokConnect";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { formatTZS } from "@/data/mockData";
import {
  fetchTikTokCreatorInfo,
  postProductToTikTok,
  type TikTokCreatorInfo,
  type TikTokPostOptions,
} from "@/lib/api/domains/tiktok";
import type { Product } from "@/types";

type PrivacyChoice = TikTokPostOptions["privacyLevel"];

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  SELF_ONLY: "Only me",
};

/** The reel generator gives one photo 10 s and every additional photo 4 s,
 *  capped at 20 stills — the same formula the backend uses to pre-check the
 *  account's max_video_post_duration_sec, so the estimate here is exact. */
const SINGLE_IMAGE_SECONDS = 10;
const SECONDS_PER_IMAGE = 4;
const MAX_REEL_IMAGES = 20;

function estimateVideoSeconds(imageCount: number): number {
  const count = Math.min(Math.max(imageCount, 1), MAX_REEL_IMAGES);
  return count === 1 ? SINGLE_IMAGE_SECONDS : count * SECONDS_PER_IMAGE;
}

interface TikTokPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  shopId: string;
  /** Draft caption to pre-fill (e.g. an AI ad the merchant generated); still fully editable and only sent on explicit publish. */
  initialCaption?: string;
  onPublished?: () => void;
}

/**
 * Pre-publish sheet for the TikTok Content Posting API, driven end-to-end by
 * TikTok's Required UX: creator capabilities are fetched before the form
 * renders (privacy options, disabled interactions, max video length), nothing
 * is preset for the merchant, commercial disclosure is opt-in, and the
 * consent line is shown exactly as the guidelines phrase it. If the account
 * cannot post right now, publishing stops and the sheet says to try later.
 */
export default function TikTokPublishDialog({
  open, onOpenChange, product, shopId, initialCaption, onPublished,
}: TikTokPublishDialogProps) {
  const [caption, setCaption] = useState("");
  const [postFormat, setPostFormat] = useState<"reel" | "photo">("reel");
  const [privacy, setPrivacy] = useState<PrivacyChoice | "">("");
  const [allowComments, setAllowComments] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [commercialOn, setCommercialOn] = useState(false);
  const [ownBrand, setOwnBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [creatorState, setCreatorState] = useState<"loading" | "ready" | "error">("loading");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<"success" | "failure" | null>(null);
  const [failureMessage, setFailureMessage] = useState("");

  const previewImage = useMemo(
    () => product?.imageUrls?.[0] || product?.imageUrl || "",
    [product],
  );

  const imageCount = useMemo(() => {
    if (product?.imageUrls?.length) return product.imageUrls.length;
    return product?.imageUrl ? 1 : 0;
  }, [product]);

  const loadCreatorInfo = useCallback(async () => {
    setCreatorState("loading");
    try {
      const info = await fetchTikTokCreatorInfo(shopId);
      if (!info.privacyLevelOptions.length) {
        // The account has no shareable privacy levels (unaudited app scope
        // or revoked permissions): nothing the user picks can be posted.
        setCreatorInfo(null);
        setCreatorState("error");
        return;
      }
      setCreatorInfo(info);
      setCreatorState("ready");
    } catch {
      setCreatorInfo(null);
      setCreatorState("error");
    }
  }, [shopId]);

  useEffect(() => {
    if (!open) return;
    setCaption(
      initialCaption?.trim() ||
        (product?.description ? `${product.name}\n\n${product.description}` : product?.name || ""),
    );
    setPostFormat("reel");
    setPrivacy("");
    setAllowComments(false);
    setAllowDuet(false);
    setAllowStitch(false);
    setCommercialOn(false);
    setOwnBrand(false);
    setBrandedContent(false);
    setConsent(false);
    setPublishing(false);
    setResult(null);
    setFailureMessage("");
    void loadCreatorInfo();
  }, [open, product, initialCaption, loadCreatorInfo]);

  // Branded content cannot be published as private: force a re-pick if the
  // merchant selected "Only me" and then enabled commercial disclosure.
  useEffect(() => {
    if (commercialOn && privacy === "SELF_ONLY") setPrivacy("");
  }, [commercialOn, privacy]);

  const videoSeconds = estimateVideoSeconds(imageCount || 1);
  const maxSeconds = creatorInfo?.maxVideoPostDurationSec || 0;
  const tooLong = postFormat === "reel" && maxSeconds > 0 && videoSeconds > maxSeconds;
  const commercialDisclosed = commercialOn && (ownBrand || brandedContent);

  const canPublish = Boolean(
    creatorInfo && privacy && consent && commercialOn === commercialDisclosed && !tooLong && !publishing,
  );

  const handlePublish = async () => {
    if (!product || !privacy || !canPublish) return;
    setPublishing(true);
    try {
      await postProductToTikTok(shopId, product.id, caption.trim() || undefined, {
        postFormat,
        privacyLevel: privacy,
        disableComment: !allowComments,
        disableDuet: !allowDuet,
        disableStitch: !allowStitch,
        brandContent: brandedContent,
        brandOrganic: ownBrand,
      });
      setResult("success");
      onPublished?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Imeshindwa kuchapisha TikTok.";
      setFailureMessage(message);
      setResult("failure");
    } finally {
      setPublishing(false);
    }
  };

  const privacyLabel = (privacy && (PRIVACY_LABELS[privacy] || privacy)) || "";

  const interactionRow = (
    label: string,
    checked: boolean,
    onChange: (next: boolean) => void,
    disabled: boolean,
  ) => (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <span className="text-sm">Allow {label}</span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !publishing && onOpenChange(next)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TikTokIcon className="h-5 w-5" />
            {result === "success" ? "Published to TikTok" : result === "failure" ? "Publishing failed" : "Post to TikTok"}
          </DialogTitle>
          <DialogDescription>
            {result === null && creatorState === "ready" && creatorInfo && (
              <span className="flex items-center gap-1.5">
                Posting as <span className="font-medium text-foreground">@{creatorInfo.username}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {result === "success" && product && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/40 dark:border-green-900 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-green-800 dark:text-green-300">Submission received</p>
                <p className="text-green-700 dark:text-green-400">
                  <span className="font-medium">{product.name}</span> was sent to TikTok for{" "}
                  <span className="font-medium">{privacyLabel}</span>. The {postFormat === "reel" ? "video" : "photos"} may take a few minutes to
                  process before it appears on your profile.
                </p>
              </div>
            </div>
            <Button className="w-full bg-black text-white hover:bg-black/90" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}

        {result === "failure" && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-red-800 dark:text-red-300">TikTok rejected the post</p>
                <p className="text-red-700 dark:text-red-400 break-words">{failureMessage}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Close</Button>
              <Button
                className="flex-1 bg-black text-white hover:bg-black/90"
                onClick={() => { setResult(null); }}
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {result === null && creatorState === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Checking what this TikTok account can post…</p>
          </div>
        )}

        {result === null && creatorState === "error" && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 p-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-300">Can't post right now</p>
                <p className="text-amber-700 dark:text-amber-400">
                  TikTok isn't sharing this account's posting permissions. Publishing is paused — please try
                  again in a little while.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => void loadCreatorInfo()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Try again
            </Button>
          </div>
        )}

        {result === null && creatorState === "ready" && creatorInfo && product && (
          <div className="space-y-5 py-2">
            <div className="flex gap-3">
              <div className="relative h-24 w-24 shrink-0 rounded-md overflow-hidden border bg-muted">
                {previewImage ? (
                  <ProfessionalImage src={previewImage} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <Video className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{product.name}</p>
                <p className="text-sm text-muted-foreground">{formatTZS(product.sellingPrice)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {postFormat === "reel"
                    ? `Your photos become a ~${videoSeconds}s video. You can edit everything below before it goes out.`
                    : `Your photos will be posted as a carousel. You can edit everything below before it goes out.`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Post format</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPostFormat("reel")}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    postFormat === "reel"
                      ? "border-black bg-black text-white"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Video reel
                </button>
                <button
                  type="button"
                  onClick={() => setPostFormat("photo")}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    postFormat === "photo"
                      ? "border-black bg-black text-white"
                      : "border-input bg-background hover:bg-muted"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  Photo carousel
                </button>
              </div>
            </div>

            {tooLong && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  This video would be about {videoSeconds}s but this TikTok account allows at most {maxSeconds}s.
                  Remove some photos and try again.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tiktok-caption">Caption</Label>
              <Textarea
                id="tiktok-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={3}
                maxLength={2200}
                placeholder="Describe this product for your TikTok audience"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok-privacy">Who can see this post?</Label>
              <Select value={privacy} onValueChange={(value) => setPrivacy(value as PrivacyChoice)}>
                <SelectTrigger id="tiktok-privacy">
                  <SelectValue placeholder="Choose who can watch" />
                </SelectTrigger>
                <SelectContent>
                  {creatorInfo.privacyLevelOptions.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      disabled={commercialOn && option === "SELF_ONLY"}
                    >
                      {PRIVACY_LABELS[option] || option}
                      {commercialOn && option === "SELF_ONLY" ? " (not available for branded content)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <Label>Interactions</Label>
              <div className="space-y-2.5">
                {interactionRow("comments", allowComments, setAllowComments, creatorInfo.commentDisabled)}
                {interactionRow("duet", allowDuet, setAllowDuet, creatorInfo.duetDisabled)}
                {interactionRow("stitch", allowStitch, setAllowStitch, creatorInfo.stitchDisabled)}
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="tiktok-commercial">Commercial content</Label>
                  <p className="text-xs text-muted-foreground">
                    Turn on if this video promotes a brand or product.
                  </p>
                </div>
                <Switch
                  id="tiktok-commercial"
                  checked={commercialOn}
                  onCheckedChange={(next) => {
                    setCommercialOn(next);
                    if (!next) {
                      setOwnBrand(false);
                      setBrandedContent(false);
                    }
                  }}
                />
              </div>
              {commercialOn && (
                <div className="space-y-2.5 border-t pt-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={ownBrand}
                      onCheckedChange={(value) => setOwnBrand(value === true)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium">Your brand</span>
                      <span className="block text-xs text-muted-foreground">
                        Promotional content — you are promoting your own business or product.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={brandedContent}
                      onCheckedChange={(value) => setBrandedContent(value === true)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium">Branded content</span>
                      <span className="block text-xs text-muted-foreground">
                        Paid partnership — you received something of value to feature a brand.
                      </span>
                    </span>
                  </label>
                  {!ownBrand && !brandedContent && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Pick at least one option to describe this commercial content.
                    </p>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} className="mt-0.5" />
              <span className="text-xs text-muted-foreground">
                By posting, you agree to TikTok's Music Usage Confirmation
                {commercialOn && " and Branded Content Policy"}.
              </span>
            </label>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={publishing}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-black text-white hover:bg-black/90"
                onClick={handlePublish}
                disabled={!canPublish}
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
                {publishing ? "Publishing..." : "Publish Now"}
              </Button>
            </div>
            {creatorInfo && !privacy && (
              <p className="text-xs text-muted-foreground text-center">Pick an audience above to enable publishing.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
