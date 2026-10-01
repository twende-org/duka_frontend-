import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as inventoryApi from "@/lib/api/domains/inventory";
import { getFriendlyError } from "@/lib/errorMapping";
import type { Stock, StockMovement } from "@/types";

interface InventoryState {
  inventory: Stock[];
  movements: StockMovement[];
  loading: boolean;
  movementsLoading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  inventory: [],
  movements: [],
  loading: false,
  movementsLoading: false,
  error: null,
};

export const fetchInventory = createAsyncThunk(
  "inventory/fetch",
  async (shopId: string) => {
    return await inventoryApi.getInventory(shopId);
  }
);

export const fetchStockMovements = createAsyncThunk(
  "inventory/fetchMovements",
  async ({ shopId, productId }: { shopId: string; productId?: string }) => {
    return await inventoryApi.getStockMovements(shopId, productId);
  }
);

export const adjustStock = createAsyncThunk(
  "inventory/adjust",
  async (data: Omit<StockMovement, "id">, { dispatch }) => {
    await inventoryApi.adjustStock(data);
    dispatch(fetchInventory(data.shopId));
    if (data.productId) {
      dispatch(fetchStockMovements({ shopId: data.shopId, productId: data.productId }));
    }
    return data;
  }
);

export const updateMinStock = createAsyncThunk(
  "inventory/updateMinStock",
  async ({ shopId, productId, minStock }: { shopId: string; productId: string; minStock: number }, { dispatch }) => {
    await inventoryApi.updateStockMinLevel(shopId, productId, minStock);
    dispatch(fetchInventory(shopId));
    return { productId, minStock };
  }
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    setInventoryItem(state, action: { payload: Stock }) {
      const idx = state.inventory.findIndex(i => i.productId === action.payload.productId);
      if (idx !== -1) {
        state.inventory[idx] = action.payload;
      } else {
        state.inventory.push(action.payload);
      }
    },
    setMovements(state, action: { payload: StockMovement[] }) {
      state.movements = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchInventory.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchInventory.fulfilled, (state, action) => {
      state.loading = false;
      state.inventory = action.payload;
      state.error = null;
    });
    builder.addCase(fetchInventory.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    builder.addCase(fetchStockMovements.pending, (state) => {
      state.movementsLoading = true;
      state.error = null;
    });
    builder.addCase(fetchStockMovements.fulfilled, (state, action) => {
      state.movementsLoading = false;
      state.movements = action.payload;
      state.error = null;
    });
    builder.addCase(fetchStockMovements.rejected, (state, action) => {
      state.movementsLoading = false;
      state.error = getFriendlyError(action.error);
    });

    builder.addCase(adjustStock.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(adjustStock.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(adjustStock.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    builder.addCase(updateMinStock.pending, (state) => { state.error = null; });
    builder.addCase(updateMinStock.rejected, (state, action) => {
      state.error = getFriendlyError(action.error);
    });
  },
});

export const { setInventoryItem, setMovements, clearError } = inventorySlice.actions;
export default inventorySlice.reducer;
