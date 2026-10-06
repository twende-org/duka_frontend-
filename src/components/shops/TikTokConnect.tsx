import { useState, useEffect } from "react";
import { Check, AlertCircle, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  disconnectTikTok,
  fetchTikTokConnection,
  fetchTikTokSessionUser,
  getTikTokCallbackUrl,
  getTikTokClientKey,
  saveTikTokConnection,
  type TikTokAccount,
  type TikTokConnection,
} from "@/lib/api/domains/tiktok";

/**
 * Neutral short-video glyph marking TikTok surfaces. TikTok's Design
 * Guidelines forbid their logo/note icon without prior written permission,
 * so this is a generic vertical-video mark — not the TikTok brand asset —
 * reused by Products.tsx and the publish dialog.
 */
export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
    >
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M10.2 9.6l5 2.9-5 2.9z" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface TikTokConnectProps {
  shopId: string;
}

const TIKTOK_SCOPES = ["user.info.basic", "video.upload", "video.publish"].join(",");

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const verifier = toBase64Url(random);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: toBase64Url(new Uint8Array(digest)) };
}

export default function TikTokConnect({ shopId }: TikTokConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<TikTokConnection | null>(null);
  const [pendingAccount, setPendingAccount] = useState<TikTokAccount | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 1. Check if the shop already has a connected account
    async function checkConnection() {
      try {
        setConnected(await fetchTikTokConnection(shopId));
      } catch (err) {
        console.error("Error checking TikTok connection:", err);
      } finally {
        setLoading(false);
      }
    }

    checkConnection();

    // 2. Check for redirect data in URL params
    const params = new URLSearchParams(window.location.search);
    const returnedSessionId = params.get("tt_session_id");
    const returnedShopId = params.get("shopId");

    if (returnedSessionId && returnedShopId === shopId) {
      setSessionId(returnedSessionId);
      // Clear query params immediately to keep the URL clean and secure
      window.history.replaceState({}, document.title, window.location.pathname);

      const fetchSessionUser = async () => {
        try {
          setPendingAccount(await fetchTikTokSessionUser(returnedSessionId));
          toast.success("TikTok securely connected! Confirm to finish setup.");
        } catch (err: any) {
          console.error("Failed to fetch TikTok session:", err);
          toast.error(err.message || "Session expired. Please connect again.");
        }
      };

      fetchSessionUser();
    }
  }, [shopId]);

  const handleConnect = async () => {
    const clientKey = getTikTokClientKey();
    if (!clientKey) {
      toast.error("TikTok Client Key is not configured. Set VITE_TIKTOK_CLIENT_KEY in the environment.");
      return;
    }
    setConnecting(true);
    try {
      // TikTok Login Kit v2 requires PKCE: the S256 challenge rides in the
      // authorize URL and the verifier round-trips through state so the
      // backend callback can send it in the token exchange.
      const { verifier, challenge } = await createPkcePair();
      // Pass both shopId and the current origin so the callback can redirect back locally or production
      const stateObj = { shopId, origin: window.location.origin, returnPath: window.location.pathname, codeVerifier: verifier };
      const stateParam = encodeURIComponent(btoa(JSON.stringify(stateObj)));
      const redirectUri = getTikTokCallbackUrl();
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${TIKTOK_SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${stateParam}&code_challenge=${challenge}&code_challenge_method=S256`;

      window.location.href = authUrl;
    } catch {
      setConnecting(false);
      toast.error("Could not start TikTok login. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectTikTok(shopId);
      setConnected(null);
      toast.success("Disconnected successfully!");
    } catch (err: any) {
      toast.error("Failed to disconnect.");
    }
  };

  const handleConfirmAccount = async () => {
    if (!sessionId) {
      toast.error("Security session missing. Please reconnect.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveTikTokConnection(shopId, sessionId);
      const username = result.username || pendingAccount?.username || pendingAccount?.displayName || "TikTok";
      setConnected({ id: "", openId: pendingAccount?.openId, username });
      setPendingAccount(null);
      setSessionId(null);
      toast.success(`Connected to @${username} successfully!`);
    } catch (err: any) {
      console.error("Error saving TikTok connection:", err);
      toast.error(err.message || "Failed to save connection.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Checking connection...</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center border-2 border-card">
            <TikTokIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">TikTok</h3>
            <p className="text-[11px] text-muted-foreground">Post product videos to your account</p>
          </div>
        </div>
        {connected ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
            <Check className="h-3 w-3" /> Connected
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <AlertCircle className="h-3 w-3" /> Not Connected
          </div>
        )}
      </div>

      {connected ? (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">@{connected.username || "TikTok"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
                Disconnect
              </Button>
              <Button variant="ghost" size="sm" onClick={handleConnect} className="h-7 text-[10px]">
                Change Account
              </Button>
            </div>
          </div>
        </div>
      ) : pendingAccount ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground italic">Confirm the account to connect:</p>
          <div className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {pendingAccount.avatarUrl ? (
                <img src={pendingAccount.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                  <TikTokIcon className="h-4 w-4 text-white" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">@{pendingAccount.username || pendingAccount.openId}</p>
                {pendingAccount.displayName && (
                  <p className="text-[10px] text-muted-foreground">{pendingAccount.displayName}</p>
                )}
              </div>
            </div>
            <Button onClick={handleConfirmAccount} disabled={saving} size="sm" className="h-8 text-[11px] bg-black hover:bg-black/80 text-white">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Connect
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full h-10 gap-2 bg-black hover:bg-black/80 text-white font-bold"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <TikTokIcon className="h-4 w-4" />}
          Connect TikTok Account
        </Button>
      )}

      {connected && (
        <p className="text-[10px] text-muted-foreground leading-relaxed text-center italic">
          Tip: Go to the Products list and click "Post to TikTok" to share your items!
        </p>
      )}
    </div>
  );
}
