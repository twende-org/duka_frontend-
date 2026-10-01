import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { getInvitationsByEmail, acceptInvitation, declineInvitation } from "@/lib/api/domains/shops";
import type { Invitation } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, X, Bell } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { fetchShops } from "@/store/shopsSlice";
import { loadUserProfile } from "@/store/authSlice";

export default function InvitationAlert() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const [invites, setInvites] = useState<Invitation[]>([]);

  useEffect(() => {
    if (user?.email) {
      loadInvites();
    }
  }, [user?.email]);

  async function loadInvites() {
    try {
      const pending = await getInvitationsByEmail(user!.email);
      setInvites(pending);
    } catch (err) {
      console.error("Failed to load invitations:", err);
    }
  }

  async function handleAccept(invite: Invitation) {
    if (!user) return;
    try {
      await acceptInvitation(invite.id, user.id);
      toast.success(t("users.assigned"));
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      
      // Refresh user roles and shops
      await dispatch(loadUserProfile());
      await dispatch(fetchShops(user.id));
      
      // Optional: Refresh page to update context
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDecline(invite: Invitation) {
    try {
      // The invitee cannot reach the owner-only withdraw path, so this uses the
      // dedicated decline action instead.
      await declineInvitation(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      toast.info(t("invitation.decline") + " successfully");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (invites.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {invites.map((invite) => (
        <Alert key={invite.id} className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-l-4 border-l-primary">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10 mt-1">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <AlertTitle className="text-primary font-bold">
                {t("invitation.new")}
              </AlertTitle>
              <AlertDescription className="text-muted-foreground mt-1">
                {t("users.addToShop")}: <span className="font-semibold text-foreground uppercase">{invite.shopName || 'Shop'}</span> {t("common.as")} <span className="font-semibold text-foreground italic">{invite.role}</span>
              </AlertDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button 
                size="sm" 
                variant="outline" 
                className="h-8 border-destructive/20 hover:bg-destructive/10 text-destructive"
                onClick={() => handleDecline(invite)}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t("invitation.decline")}
            </Button>
            <Button 
                size="sm" 
                className="h-8 shadow-md"
                onClick={() => handleAccept(invite)}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              {t("invitation.accept")}
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
