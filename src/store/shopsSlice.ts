import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import * as fs from "@/lib/api/domains/shops";
import { getFriendlyError } from "@/lib/errorMapping";
import type { Shop } from "@/types";

interface ShopsState {
  shops: Shop[];
  currentShopId: string | null;
  loading: boolean;
  error: string | null;
  /** True once the first shops fetch has settled; AppLayout waits for this so
   *  it never paints a panel before it knows the caller's shops. */
  initialized: boolean;
}

const initialState: ShopsState = {
  shops: [],
  currentShopId: null,
  loading: false,
  error: null,
  initialized: false,
};

export const fetchShops = createAsyncThunk("shops/fetch", async (ownerId: string) => {
  return await fs.getShops(ownerId);
});

export const createShop = createAsyncThunk("shops/create", async (data: Omit<Shop, "id">) => {
  const id = await fs.addShop(data);
  return { ...data, id } as Shop;
});

export const editShop = createAsyncThunk("shops/edit", async ({ id, data }: { id: string; data: Partial<Shop> }) => {
  await fs.updateShop(id, data);
  return { id, data };
});

export const removeShop = createAsyncThunk("shops/remove", async (id: string) => {
  await fs.deleteShop(id);
  return id;
});

const shopsSlice = createSlice({
  name: "shops",
  initialState,
  reducers: {
    setCurrentShop(state, action: PayloadAction<string>) {
      state.currentShopId = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchShops.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchShops.fulfilled, (state, action) => {
      state.loading = false;
      state.shops = action.payload;
      if (!state.currentShopId && action.payload.length > 0) {
        state.currentShopId = action.payload[0].id;
      }
      state.error = null;
      state.initialized = true;
    });
    builder.addCase(fetchShops.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
      state.initialized = true;
    });

    // Create
    builder.addCase(createShop.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(createShop.fulfilled, (state, action) => {
      state.loading = false;
      state.shops.push(action.payload);
      if (!state.currentShopId) state.currentShopId = action.payload.id;
    });
    builder.addCase(createShop.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Edit
    builder.addCase(editShop.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(editShop.fulfilled, (state, action) => {
      state.loading = false;
      const idx = state.shops.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) state.shops[idx] = { ...state.shops[idx], ...action.payload.data };
    });
    builder.addCase(editShop.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Remove
    builder.addCase(removeShop.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(removeShop.fulfilled, (state, action) => {
      state.loading = false;
      state.shops = state.shops.filter((s) => s.id !== action.payload);
      if (state.currentShopId === action.payload) {
        state.currentShopId = state.shops[0]?.id || null;
      }
    });
    builder.addCase(removeShop.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });
  },
});

export const { setCurrentShop, clearError } = shopsSlice.actions;
export default shopsSlice.reducer;
