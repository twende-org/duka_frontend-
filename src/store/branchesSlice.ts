import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import * as fs from "@/lib/api/domains/shops";
import { getFriendlyError } from "@/lib/errorMapping";
import type { Branch } from "@/types";

interface BranchesState {
  branches: Branch[];
  currentBranchId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: BranchesState = {
  branches: [],
  currentBranchId: null,
  loading: false,
  error: null,
};

export const fetchBranches = createAsyncThunk("branches/fetch", async (shopId: string) => {
  return await fs.getBranches(shopId);
});

export const createBranch = createAsyncThunk("branches/create", async (data: Omit<Branch, "id">) => {
  const id = await fs.addBranch(data);
  return { ...data, id } as Branch;
});

export const editBranch = createAsyncThunk("branches/edit", async ({ id, data }: { id: string; data: Partial<Branch> }) => {
  await fs.updateBranch(id, data);
  return { id, data };
});

export const removeBranch = createAsyncThunk("branches/remove", async (id: string) => {
  await fs.deleteBranch(id);
  return id;
});

const branchesSlice = createSlice({
  name: "branches",
  initialState,
  reducers: {
    setCurrentBranch(state, action: PayloadAction<string>) {
      state.currentBranchId = action.payload;
    },
    clearBranchesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchBranches.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchBranches.fulfilled, (state, action) => {
      state.loading = false;
      state.branches = action.payload;
      // If we don't have a branch selected, or the selected one isn't in the list, pick the first one
      if (!state.currentBranchId && action.payload.length > 0) {
        state.currentBranchId = action.payload[0].id;
      } else if (state.currentBranchId && !action.payload.find(b => b.id === state.currentBranchId)) {
        state.currentBranchId = action.payload.length > 0 ? action.payload[0].id : null;
      }
      state.error = null;
    });
    builder.addCase(fetchBranches.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Create
    builder.addCase(createBranch.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(createBranch.fulfilled, (state, action) => {
      state.loading = false;
      state.branches.push(action.payload);
      if (!state.currentBranchId) state.currentBranchId = action.payload.id;
    });
    builder.addCase(createBranch.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Edit
    builder.addCase(editBranch.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(editBranch.fulfilled, (state, action) => {
      state.loading = false;
      const idx = state.branches.findIndex((b) => b.id === action.payload.id);
      if (idx !== -1) state.branches[idx] = { ...state.branches[idx], ...action.payload.data };
    });
    builder.addCase(editBranch.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Remove
    builder.addCase(removeBranch.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(removeBranch.fulfilled, (state, action) => {
      state.loading = false;
      state.branches = state.branches.filter((b) => b.id !== action.payload);
      if (state.currentBranchId === action.payload) {
        state.currentBranchId = state.branches[0]?.id || null;
      }
    });
    builder.addCase(removeBranch.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });
  },
});

export const { setCurrentBranch, clearBranchesError } = branchesSlice.actions;
export default branchesSlice.reducer;
