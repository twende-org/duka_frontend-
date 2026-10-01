import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import * as expensesApi from "@/lib/api/domains/expenses";
import { getFriendlyError } from "@/lib/errorMapping";
import type { Expense } from "@/types";

interface ExpensesState {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  lastVisible: any;
  hasMore: boolean;
}

const initialState: ExpensesState = { 
  expenses: [], 
  loading: false, 
  error: null,
  lastVisible: null,
  hasMore: true
};

export const fetchExpenses = createAsyncThunk("expenses/fetch", async (shopId: string) => {
  return await expensesApi.getExpenses(shopId);
});

export const fetchExpensesPaginated = createAsyncThunk(
  "expenses/fetchPaginated",
  async ({ shopId, pageSize = 20, lastDoc }: { shopId: string; pageSize?: number; lastDoc?: any }) => {
    return await expensesApi.getExpensesPaginated(shopId, pageSize, lastDoc);
  }
);

export const createExpense = createAsyncThunk("expenses/create", async (data: Omit<Expense, "id">) => {
  const id = await expensesApi.addExpense(data);
  return { ...data, id } as Expense;
});

export const editExpense = createAsyncThunk("expenses/edit", async ({ id, data }: { id: string; data: Partial<Expense> }) => {
  await expensesApi.updateExpense(id, data);
  return { id, data };
});

export const removeExpense = createAsyncThunk("expenses/remove", async (id: string) => {
  await expensesApi.deleteExpense(id);
  return id;
});

const expensesSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    resetPagination(state) {
      state.expenses = [];
      state.lastVisible = null;
      state.hasMore = true;
    }
  },
  extraReducers: (builder) => {
    // Fetch All
    builder.addCase(fetchExpenses.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchExpenses.fulfilled, (state, action) => { state.loading = false; state.expenses = action.payload; state.error = null; });
    builder.addCase(fetchExpenses.rejected, (state, action) => { 
      state.loading = false; 
      state.error = getFriendlyError(action.error);
    });

    // Fetch Paginated
    builder.addCase(fetchExpensesPaginated.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchExpensesPaginated.fulfilled, (state, action) => {
      state.loading = false;
      const newExpenses = action.payload.data;
      
      const uniqueExpenses = new Map(state.expenses.map(e => [e.id, e]));
      newExpenses.forEach(e => uniqueExpenses.set(e.id, e));
      state.expenses = Array.from(uniqueExpenses.values());
      
      state.lastVisible = action.payload.lastDoc;
      state.hasMore = action.payload.hasMore;
    });
    builder.addCase(fetchExpensesPaginated.rejected, (state, action) => {
      state.loading = false;
      state.error = getFriendlyError(action.error);
    });

    // Create
    builder.addCase(createExpense.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(createExpense.fulfilled, (state, action) => { state.loading = false; state.expenses.unshift(action.payload); });
    builder.addCase(createExpense.rejected, (state, action) => { 
      state.loading = false; 
      state.error = getFriendlyError(action.error);
    });

    // Edit
    builder.addCase(editExpense.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(editExpense.fulfilled, (state, action) => {
      state.loading = false;
      const idx = state.expenses.findIndex(e => e.id === action.payload.id);
      if (idx >= 0) state.expenses[idx] = { ...state.expenses[idx], ...action.payload.data };
    });
    builder.addCase(editExpense.rejected, (state, action) => { 
      state.loading = false; 
      state.error = getFriendlyError(action.error);
    });

    // Remove
    builder.addCase(removeExpense.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(removeExpense.fulfilled, (state, action) => {
      state.loading = false;
      state.expenses = state.expenses.filter(e => e.id !== action.payload);
    });
    builder.addCase(removeExpense.rejected, (state, action) => { 
      state.loading = false; 
      state.error = getFriendlyError(action.error);
    });
  },
});

export const { clearError, resetPagination } = expensesSlice.actions;
export default expensesSlice.reducer;
