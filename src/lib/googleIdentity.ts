/**
 * Google Identity Services (GIS) loader.
 *
 * Sign-in is Google-only: the auth pages render Google's official button and
 * the resulting ID token is posted to the Django backend, which verifies it
 * against the matching `GOOGLE_CLIENT_ID`.
 */

import { runtimeEnv } from "@/lib/api/config";

const GIS_SCRIPT_ID = "google-identity-services";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface GoogleIdentityApi {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    auto_select?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: { theme?: string; size?: string; text?: string; shape?: string; width?: number }
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityApi } };
  }
}

export function getGoogleClientId(): string {
  const value = runtimeEnv("VITE_GOOGLE_CLIENT_ID");
  return typeof value === "string" ? value.trim() : "";
}

/** True when Google sign-in can be offered on this deployment. */
export function isGoogleSignInConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

let scriptPromise: Promise<void> | null = null;
let initializedClientId = "";
let credentialHandler: ((credential: string) => void) | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.id = GIS_SCRIPT_ID;
        script.src = GIS_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener(
        "error",
        () => {
          scriptPromise = null;
          reject(new Error("Google sign-in script failed to load"));
        },
        { once: true }
      );
    });
  }
  return scriptPromise;
}

/**
 * Outcome of a render attempt, so callers can show the right fallback:
 * "unconfigured" = no client ID on this deployment, "unavailable" = the GIS
 * script could not load, "ready" = Google's button is mounted.
 */
export type GoogleButtonStatus = "ready" | "unconfigured" | "unavailable";

/**
 * Render Google's button inside `container`.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (credential: string) => void
): Promise<GoogleButtonStatus> {
  const clientId = getGoogleClientId();
  if (!clientId) return "unconfigured";

  try {
    await loadGisScript();
  } catch (error) {
    console.warn("Google sign-in unavailable:", error);
    return "unavailable";
  }

  const api = window.google?.accounts?.id;
  if (!api) return "unavailable";

  // initialize() binds its callback once per page load, so route through a
  // module-level handler that each page can replace on remount.
  credentialHandler = onCredential;
  if (initializedClientId !== clientId) {
    api.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response?.credential) credentialHandler?.(response.credential);
      },
      auto_select: false,
    });
    initializedClientId = clientId;
  }

  container.replaceChildren();
  api.renderButton(container, {
    theme: "outline",
    size: "large",
    shape: "rectangular",
    text: "continue_with",
    width: container.clientWidth || 320,
  });
  return "ready";
}
