import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchMeOnApi,
  fetchMyRolesOnApi,
  loginWithEmailOnApi,
  loginWithGoogleOnApi,
  logoutOnApi,
  registerWithEmailOnApi,
  updateMeOnApi,
  type ProfileUpdate,
} from "@/lib/api/domains/auth";
import { resolveIdentityInBackground } from "@/lib/api/domains/identity";
import { getFriendlyError } from "@/lib/errorMapping";
import type { UserProfile, UserRole } from "@/types";

interface AuthState {
  user: UserProfile | null;
  roles: UserRole[];
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  roles: [],
  loading: false,
  error: null,
};

export const registerUser = createAsyncThunk(
  "auth/register",
  async ({
    email,
    password,
    displayName,
    accountType = "customer",
  }: {
    email: string;
    password: string;
    displayName: string;
    accountType?: "merchant" | "customer" | "unassigned";
  }) => {
    const session = await registerWithEmailOnApi({ email, password, displayName, accountType });
    resolveIdentityInBackground(session.user);
    return { user: session.user, roles: session.roles };
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }: { email: string; password: string }) => {
    const session = await loginWithEmailOnApi(email, password);
    resolveIdentityInBackground(session.user);
    return { user: session.user, roles: session.roles };
  }
);

/** `credential` is the ID token GIS hands to the sign-in callback. */
export const loginWithGoogle = createAsyncThunk(
  "auth/loginWithGoogle",
  async (credential: string) => {
    const session = await loginWithGoogleOnApi(credential);
    resolveIdentityInBackground(session.user);
    return { user: session.user, roles: session.roles };
  }
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  logoutOnApi();
});

/**
 * Restore the session after a reload (or after any sign-in): the JWT pair in
 * storage is the source of truth, so this reads the profile from the API.
 *
 * The failure value is passed through unwrapped so callers can tell a dead
 * session (401) apart from a transient network problem.
 */
export const loadUserProfile = createAsyncThunk(
  "auth/loadProfile",
  async (_, { rejectWithValue }) => {
    try {
      const user = await fetchMeOnApi();
      let roles: UserRole[] = [];
      try {
        roles = await fetchMyRolesOnApi();
      } catch (e) {
        console.warn("Could not load roles:", e);
      }
      return { user, roles };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

/** Persist a profile change and keep the store in step with the backend. */
export const saveUserProfile = createAsyncThunk(
  "auth/saveProfile",
  async (patch: ProfileUpdate) => updateMeOnApi(patch)
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setUser(state, action: PayloadAction<UserProfile | null>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(registerUser.fulfilled, (state, action) => { state.loading = false; state.user = action.payload.user; state.roles = action.payload.roles; });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error.message || "auth.error.unknown");
    });
    builder.addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(loginUser.fulfilled, (state, action) => { state.loading = false; state.user = action.payload.user; state.roles = action.payload.roles; });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error.message || "auth.error.unknown");
    });
    builder.addCase(loginWithGoogle.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(loginWithGoogle.fulfilled, (state, action) => { state.loading = false; state.user = action.payload.user; state.roles = action.payload.roles; });
    builder.addCase(loginWithGoogle.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error.message || "auth.error.unknown");
    });
    builder.addCase(logoutUser.fulfilled, (state) => { state.user = null; state.roles = []; });
    builder.addCase(loadUserProfile.fulfilled, (state, action) => { state.user = action.payload.user; state.roles = action.payload.roles; state.loading = false; });
    builder.addCase(loadUserProfile.pending, (state) => { state.loading = true; });
    builder.addCase(loadUserProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.payload ?? action.error.message ?? "auth.error.unknown");
    });
    builder.addCase(saveUserProfile.fulfilled, (state, action) => {
      state.user = action.payload;
    });
    builder.addCase(saveUserProfile.rejected, (state, action) => {
      state.error = getFriendlyError(action.error.message || "auth.error.unknown");
    });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
