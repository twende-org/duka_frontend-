import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CLIENT_ID = "test-client-id.apps.googleusercontent.com";

function removeInjectedScript() {
  document.getElementById("google-identity-services")?.remove();
}

async function loadModule() {
  vi.resetModules();
  return import("@/lib/googleIdentity");
}

describe("googleIdentity", () => {
  beforeEach(() => {
    removeInjectedScript();
    delete (window as { google?: unknown }).google;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    removeInjectedScript();
    delete (window as { google?: unknown }).google;
  });

  it("reports sign-in as unconfigured without a client ID", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    const { isGoogleSignInConfigured, renderGoogleButton } = await loadModule();

    expect(isGoogleSignInConfigured()).toBe(false);
    await expect(
      renderGoogleButton(document.createElement("div"), vi.fn())
    ).resolves.toBe("unconfigured");
  });

  it("renders Google's button and forwards the GIS credential", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", CLIENT_ID);
    const initialize = vi.fn();
    const renderButton = vi.fn();
    (window as { google?: unknown }).google = { accounts: { id: { initialize, renderButton } } };

    const { isGoogleSignInConfigured, renderGoogleButton } = await loadModule();
    expect(isGoogleSignInConfigured()).toBe(true);

    const container = document.createElement("div");
    const onCredential = vi.fn();
    await expect(renderGoogleButton(container, onCredential)).resolves.toBe("ready");

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: CLIENT_ID, auto_select: false })
    );
    expect(renderButton).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ text: "continue_with" })
    );

    initialize.mock.calls[0][0].callback({ credential: "id-token-123" });
    expect(onCredential).toHaveBeenCalledWith("id-token-123");
  });

  it("reports unavailability when the GIS script fails to load", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", CLIENT_ID);
    const { renderGoogleButton } = await loadModule();

    const pending = renderGoogleButton(document.createElement("div"), vi.fn());
    const script = document.getElementById("google-identity-services");
    expect(script).not.toBeNull();
    script!.dispatchEvent(new Event("error"));

    await expect(pending).resolves.toBe("unavailable");
  });
});
