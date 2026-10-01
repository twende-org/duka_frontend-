import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { I18nProvider } from "@/lib/i18n";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { loginWithGoogleOnApi, type AuthSession } from "@/lib/api/domains/auth";

const { renderGoogleButtonMock } = vi.hoisted(() => ({ renderGoogleButtonMock: vi.fn() }));

vi.mock("@/lib/googleIdentity", () => ({ renderGoogleButton: renderGoogleButtonMock }));

vi.mock("@/lib/api/domains/identity", () => ({ resolveIdentityInBackground: vi.fn() }));

vi.mock("@/lib/api/domains/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/domains/auth")>();
  return { ...actual, loginWithGoogleOnApi: vi.fn() };
});

const SESSION = {
  user: { id: "u1", email: "user@gmail.com", displayName: "User" },
  roles: [],
  isNewUser: false,
} as unknown as AuthSession;

function renderSignIn(onSuccess = vi.fn()) {
  render(
    <Provider store={store}>
      <I18nProvider>
        <GoogleSignInButton onSuccess={onSuccess} />
      </I18nProvider>
    </Provider>
  );
  return onSuccess;
}

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("twendeduka-lang", "en");
  });

  it("reveals the container once GIS is ready", async () => {
    renderGoogleButtonMock.mockResolvedValue("ready");
    renderSignIn();

    const container = screen.getByTestId("google-signin-container");
    expect(container.className).toContain("hidden");
    await waitFor(() => expect(container.className).not.toContain("hidden"));
  });

  it("explains a missing configuration instead of leaving the panel empty", async () => {
    renderGoogleButtonMock.mockResolvedValue("unconfigured");
    renderSignIn();

    expect(await screen.findByText(/not configured on this deployment/i)).toBeTruthy();
  });

  it("offers a retry when the GIS script fails to load", async () => {
    renderGoogleButtonMock.mockResolvedValue("unavailable");
    renderSignIn();

    expect(await screen.findByText(/could not load the google sign-in button/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("signs in with the credential GIS hands back", async () => {
    let credentialHandler: ((credential: string) => void) | undefined;
    renderGoogleButtonMock.mockImplementation(
      async (_container: HTMLElement, onCredential: (credential: string) => void) => {
        credentialHandler = onCredential;
        return "ready";
      }
    );
    vi.mocked(loginWithGoogleOnApi).mockResolvedValue(SESSION);

    const onSuccess = renderSignIn();
    await waitFor(() => expect(credentialHandler).toBeTypeOf("function"));

    credentialHandler!("google-id-token");

    await waitFor(() => expect(loginWithGoogleOnApi).toHaveBeenCalledWith("google-id-token"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
