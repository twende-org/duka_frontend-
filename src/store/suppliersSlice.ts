import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import * as fs from "@/lib/api/domains/suppliers";
import { getFriendlyError } from "@/lib/errorMapping";
import type { Supplier } from "@/types";

interface SuppliersState {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  lastVisible: any;
  hasMore: boolean;
}

const initialState: SuppliersState = { 
  suppliers: [], 
  loading: false, 
  error: null,
  lastVisible: null,
  hasMore: true
};

export const fetchSuppliers = createAsyncThunk("suppliers/fetch", async (shopId: string) => {
  return await fs.getSuppliers(shopId);
});

export const fetchSuppliersPaginated = createAsyncThunk(
  "suppliers/fetchPaginated",
  async ({ shopId, pageSize = 20, lastDoc }: { shopId: string; pageSize?: number; lastDoc?: any }) => {
    return await fs.getSuppliersPaginated(shopId, pageSize, lastDoc);
  }
);

export const createSupplier = createAsyncThunk("suppliers/create", async (data: Omit<Supplier, "id">) => {
  const id = await fs.addSupplier(data);
  return { ...data, id } as Supplier;
});

export const editSupplier = createAsyncThunk("suppliers/edit", async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
  await fs.updateSupplier(id, data);
  return { id, data };
});

export const removeSupplier = createAsyncThunk("suppliers/remove", async (id: string) => {
  await fs.deleteSupplier(id);
  return id;
});

const suppliersSlice = createSlice({
  name: "suppliers",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    resetPagination(state) {
      state.suppliers = [];
      state.lastVisible = null;
      state.hasMore = true;
    }
  },
  extraReducers: (builder) => {
    // Fetch All
    builder.addCase(fetchSuppliers.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchSuppliers.fulfilled, (state, action) => { state.loading = false; state.suppliers = action.payload; state.error = null; });
    builder.addCase(fetchSuppliers.rejected, (state, action) => { 
      state.loading = false; 
      state.error = getFriendlyError(action.error);
    });

    // Fetch Paginated
    builder.addCase(fetchSuppliersPaginated.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchSuppliersPaginated.fulfilled, (state, action) => {
      state.loading = false;
      const newSuppliers = action.payload.data;
      
      const uniqueSuppliers = new Map(state.suppliers.map(s => [s.id, s]));
      newSuppliers.forEach(s => uniqueSuppliers.set(s.id, s));
      state.suppliers = Array.from(uniqueSuppliers.values());
      
      state.lastVisible = action.payload.lastDoc;
      state.hasMore = action.payload.hasMore;
    });
    builder.addCase(fetchSuppliersPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Create
    builder.addCase(createSupplier.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(createSupplier.fulfilled, (state, action) => { state.loading = false; state.suppliers.unshift(action.payload); });
    builder.addCase(createSupplier.rejected, (state, action) => { 
      state.loading = false; 
      state.error = getFriendlyError(action.error);
    });

    // Edit
    builder.addCase(editSupplier.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(editSupplier.fulfilled, (state, action) => {
      state.loading = false;
      const idx = state.suppliers.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) state.suppliers[idx] = { ...state.suppliers[idx], ...action.payload.data };
    });
    builder.addCase(editSupplier.rejected, (state, action) => { 
      state.loading = false; 
      state.error = getFriendlyError(action.error);
    });

    // Remove
    builder.addCase(removeSupplier.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(removeSupplier.fulfilled, (state, action) => {
      state.loading = false;
      state.suppliers = state.suppliers.filter((s) => s.id !== action.payload);
    });
    builder.addCase(removeSupplier.rejected, (state, action) => { 
      state.loading = false; 
      state.error = getFriendlyError(action.error);
    });
  },
});

export const { clearError, resetPagination } = suppliersSlice.actions;
export default suppliersSlice.reducer;
