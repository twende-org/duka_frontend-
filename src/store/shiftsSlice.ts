import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import * as shiftsApi from "@/lib/api/domains/shifts";
import { getFriendlyError } from "@/lib/errorMapping";
import type { Shift } from "@/types";

interface ShiftsState {
  activeShift: Shift | null;
  loading: boolean;
  error: string | null;
}

const initialState: ShiftsState = {
  activeShift: null,
  loading: false,
  error: null,
};

export const fetchActiveShift = createAsyncThunk("shifts/fetchActive", async (shopId: string) => {
  return await shiftsApi.getCurrentOpenShift(shopId);
});

export const openNewShift = createAsyncThunk("shifts/open", async (data: Omit<Shift, "id" | "cashSalesTotal" | "cashExpensesTotal" | "expectedClosingCash">) => {
  return await shiftsApi.openShift(data);
});

export const closeActiveShift = createAsyncThunk("shifts/close", async ({
  shopId,
  shiftId,
  closingData
}: {
  shopId: string;
  shiftId: string;
  closingData: {
    closedBy: string;
    closedByName: string;
    actualClosingCash: number;
    cashLeftForNextDay: number;
    cashSubmittedToOwner: number;
    notes?: string;
  }
}) => {
  await shiftsApi.closeShift(shopId, shiftId, closingData);
  return shiftId; // Return to clear active shift
});

const shiftsSlice = createSlice({
  name: "shifts",
  initialState,
  reducers: {
    clearShiftError(state) {
      state.error = null;
    },
    clearActiveShift(state) {
      state.activeShift = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch Active
    builder.addCase(fetchActiveShift.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchActiveShift.fulfilled, (state, action) => {
      state.loading = false;
      state.activeShift = action.payload;
    });
    builder.addCase(fetchActiveShift.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Open Shift
    builder.addCase(openNewShift.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(openNewShift.fulfilled, (state, action) => {
      state.loading = false;
      state.activeShift = action.payload;
    });
    builder.addCase(openNewShift.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Close Shift
    builder.addCase(closeActiveShift.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(closeActiveShift.fulfilled, (state) => {
      state.loading = false;
      state.activeShift = null;
    });
    builder.addCase(closeActiveShift.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });
  },
});

export const { clearShiftError, clearActiveShift } = shiftsSlice.actions;
export default shiftsSlice.reducer;
