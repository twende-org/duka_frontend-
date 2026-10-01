import { useEffect, useState, createContext, useContext } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadUserProfile } from "@/store/authSlice";
import { clearApiTokens, hasApiSession } from "@/lib/api";
import { isAuthError } from "@/lib/api/errors";
import { resolveIdentityInBackground } from "@/lib/api/domains/identity";
import { FullPageLoader } from "@/components/common/Loader";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  authReady: boolean;
  user: UserProfile | null;
}

const AuthContext = createContext<AuthContextValue>({ authReady: false, user: null });

export function useAuthState() {
  return useContext(AuthContext);
}

/** Alias kept for legacy imports */
export const useAuth = useAuthState;

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      // The JWT pair in sessionStorage is the whole session: no stored pair
      // means nobody is signed in, so there is nothing to restore.
      if (!hasApiSession()) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      setProfileLoading(true);
      try {
        const profile = await dispatch(loadUserProfile()).unwrap();
        if (!cancelled) resolveIdentityInBackground(profile.user);
      } catch (error) {
        console.warn("Failed to restore session:", error);
        // A rejected token means the session is dead; a network hiccup does
        // not — keep the pair so the next reload can retry.
        if (isAuthError(error)) clearApiTokens();
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
          setAuthReady(true);
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authReady || profileLoading) {
    return <FullPageLoader label="Inapakia" />;
  }

  return (
    <AuthContext.Provider value={{ authReady, user }}>
      {children}
    </AuthContext.Provider>
  );
}
