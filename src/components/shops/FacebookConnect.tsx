import { useState, useEffect } from "react";
import { runtimeEnv } from "@/lib/api/config";
import { Facebook, Check, AlertCircle, Loader2, Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BotMessageSquare } from "lucide-react";
import {
  disconnectFacebookPage,
  fetchFacebookConnection,
  fetchFacebookSessionPages,
  getFacebookCallbackUrl,
  saveFacebookConnection,
  setFacebookAutoReply,
  type FacebookPage,
} from "@/lib/api/domains/social";

interface FacebookConnectProps {
  shopId: string;
}

const FB_APP_ID = runtimeEnv("VITE_FACEBOOK_APP_ID") || "";

export default function FacebookConnect({ shopId }: FacebookConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectedPage, setConnectedPage] = useState<any>(null);
  const [availablePages, setAvailablePages] = useState<FacebookPage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [envToken, setEnvToken] = useState<string | null>(runtimeEnv("VITE_FACEBOOK_ACCESS_TOKEN") || null);
  const [manualToken, setManualToken] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    // 1. Check if the shop already has a connected page
    async function checkConnection() {
      try {
        setConnectedPage(await fetchFacebookConnection(shopId));
      } catch (err) {
        console.error("Error checking FB connection:", err);
      } finally {
        setLoading(false);
      }
    }

    checkConnection();

    // 2. Check for redirect data in URL params
    const params = new URLSearchParams(window.location.search);
    const returnedSessionId = params.get("fb_session_id");
    const returnedShopId = params.get("shopId");

    if (returnedSessionId && returnedShopId === shopId) {
      setSessionId(returnedSessionId);
      // Clear query params immediately to keep the URL clean and secure
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const fetchSessionPages = async () => {
        try {
          setAvailablePages(await fetchFacebookSessionPages(returnedSessionId));
          toast.success("Facebook securely connected! Select a page to finish setup.");
        } catch (err: any) {
          console.error("Failed to fetch session pages:", err);
          toast.error(err.message || "Session expired. Please connect again.");
        }
      };
      
      fetchSessionPages();
    }
  }, [shopId]);

  const handleConnect = () => {
    setConnecting(true);
    // Construct Facebook Login URL
    // Scopes needed: pages_manage_posts, pages_show_list, pages_read_engagement, instagram_basic, instagram_content_publish
    const scopes = [
      "pages_manage_posts",
      "pages_show_list",
      "pages_read_engagement",
      "instagram_basic",
      "instagram_content_publish"
    ].join(",");
    // Pass both shopId and the current origin so the cloud function can redirect back locally or production
    const stateObj = { shopId, origin: window.location.origin, returnPath: window.location.pathname };
    const stateParam = btoa(JSON.stringify(stateObj));
    const redirectUri = getFacebookCallbackUrl();
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${stateParam}&scope=${scopes}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFacebookPage(shopId);
      setConnectedPage(null);
      toast.success("Disconnected successfully!");
    } catch (err: any) {
      toast.error("Failed to disconnect.");
    }
  };

  const handleSelectPage = async (pageId: string) => {
    const selectedPage = availablePages.find(p => p.id === pageId);
    if (!selectedPage) return;
    
    // Fallback if connecting manually (where we might not have a session but rather a manual token flow)
    // Actually if we only use Session ID for standard flow:
    if (!sessionId && availablePages.length > 0 && manualToken) {
       // Support for manual token input flow backwards compatibility
       // In a full refactor we might change this, but for now allow manual.
    } else if (!sessionId) {
       toast.error("Security session missing. Please reconnect.");
       return;
    }

    setSaving(true);
    try {
      await saveFacebookConnection(shopId, selectedPage.id, sessionId);

      setConnectedPage({
        pageId: selectedPage.id,
        pageName: selectedPage.name,
      });
      setAvailablePages([]);
      setSessionId(null);
      toast.success(`Connected to ${selectedPage.name} successfully!`);
    } catch (err: any) {
      console.error("Error saving FB connection:", err);
      toast.error(err.message || "Failed to save connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectWithEnvToken = async () => {
    if (!envToken) return;
    setSaving(true);
    try {
      // 1. Fetch info about the token/pages
      // We'll try to get accounts associated with this token
      const res = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${envToken}`);
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error.message || "Failed to fetch pages with this token.");
      }

      const pages = data.data as FacebookPage[];
      if (pages.length === 0) {
        // Maybe it's a direct Page Token? Try to get the page info directly
        const pageRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,access_token&access_token=${envToken}`);
        const pageData = await pageRes.json();
        
        if (pageData.error || !pageData.id) {
          toast.error("Token belongs to no pages or is invalid.");
          return;
        }
        
        setAvailablePages([{
          id: pageData.id,
          name: pageData.name,
          access_token: envToken, // Assume the token in .env IS the page access token
          category: ""
        }]);
      } else {
        setAvailablePages(pages);
      }
      
      toast.success("Token valid! Select a page to connect.");
    } catch (err: any) {
      console.error("Env Token Error:", err);
      toast.error(err.message || "Invalid or expired token.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectManual = async () => {
    if (!manualToken) return;
    setSaving(true);
    try {
      // 1. Fetch info about the token/pages
      const res = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${manualToken}`);
      const data = await res.json();
      
      if (data.error) throw new Error(data.error.message);

      const pages = data.data as FacebookPage[];
      if (pages.length === 0) {
        toast.error("Token has no associated pages.");
        return;
      }
      
      setAvailablePages(pages);
      toast.success("Token verified!");
    } catch (err: any) {
      toast.error(err.message || "Invalid token");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoReply = async (checked: boolean) => {
    if (!connectedPage) return;
    setSaving(true);
    try {
      await setFacebookAutoReply(shopId, checked);
      setConnectedPage((prev: any) => ({ ...prev, autoReplyEnabled: checked }));
      toast.success(checked ? "AI Auto-Reply Enabled!" : "AI Auto-Reply Disabled");
    } catch (err: any) {
      toast.error("Failed to update auto-reply settings");
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
          <div className="flex -space-x-2">
            <div className="h-10 w-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center z-10 border-2 border-card">
              <Facebook className="h-5 w-5 text-[#1877F2]" />
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center border-2 border-card opacity-90">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Facebook & Instagram</h3>
            <p className="text-[11px] text-muted-foreground">Post products to connected accounts</p>
          </div>
        </div>
        {connectedPage ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider">
            <Check className="h-3 w-3" /> Connected
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <AlertCircle className="h-3 w-3" /> Not Connected
          </div>
        )}
      </div>

      {connectedPage ? (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{connectedPage.pageName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
                Disconnect
              </Button>
              <Button variant="ghost" size="sm" onClick={handleConnect} className="h-7 text-[10px]">
                Change Page
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg border flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-500">
                <BotMessageSquare className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="auto-reply" className="text-xs font-semibold cursor-pointer">AI Auto-Reply to Comments</Label>
                <p className="text-[10px] text-muted-foreground">Automatically reply to Facebook comments to boost engagement.</p>
              </div>
            </div>
            <Switch 
              id="auto-reply" 
              checked={!!connectedPage.autoReplyEnabled} 
              onCheckedChange={handleToggleAutoReply}
              disabled={saving}
            />
          </div>
        </div>
      ) : availablePages.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground italic">Select which page to connect:</p>
          <div className="flex gap-2">
            <Select onValueChange={handleSelectPage} disabled={saving}>
              <SelectTrigger className="flex-1 text-xs h-9">
                <SelectValue placeholder="Select a Facebook Page" />
              </SelectTrigger>
              <SelectContent>
                {availablePages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {saving && (
              <Button disabled className="h-9 w-9 p-0">
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button 
          onClick={handleConnect} 
          disabled={connecting}
          className="w-full h-10 gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
          Connect Facebook Page
        </Button>
      )}

      {!connectedPage && availablePages.length === 0 && (
        <div className="pt-2 border-t border-dashed space-y-3">
          {showManual ? (
            <div className="space-y-2">
              <Input 
                placeholder="Paste Access Token here..." 
                value={manualToken} 
                onChange={(e) => setManualToken(e.target.value)}
                className="text-xs h-9 bg-muted/50"
              />
              <div className="flex gap-2">
                <Button onClick={handleConnectManual} disabled={saving || !manualToken} size="sm" className="flex-1 h-8 text-[11px]">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />} Verify Token
                </Button>
                <Button variant="ghost" onClick={() => setShowManual(false)} size="sm" className="h-8 px-2 text-[10px]">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {envToken && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setManualToken(envToken);
                    handleConnectWithEnvToken();
                  }}
                  disabled={saving}
                  className="w-full text-[11px] h-8 gap-2 border-primary/20 text-primary hover:bg-primary/5"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                  Use Token from .env
                </Button>
              )}
              <Button 
                variant="ghost" 
                onClick={() => setShowManual(true)}
                className="text-[10px] h-6 text-muted-foreground hover:text-foreground"
              >
                Pata access token mwenyewe (Manual)
              </Button>
            </div>
          )}
        </div>
      )}

      {connectedPage && (
        <p className="text-[10px] text-muted-foreground leading-relaxed text-center italic">
          Tip: Go to the Products list and click "Post to Facebook" to share your items!
        </p>
      )}
    </div>
  );
}
