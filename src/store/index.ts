import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import shopsReducer from "./shopsSlice";
import branchesReducer from "./branchesSlice";
import inventoryReducer from "./inventorySlice";
import salesReducer from "./salesSlice";
import suppliersReducer from "./suppliersSlice";
import expensesReducer from "./expensesSlice";
import shiftsReducer from "./shiftsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shops: shopsReducer,
    branches: branchesReducer,
    inventory: inventoryReducer,
    sales: salesReducer,
    suppliers: suppliersReducer,
    expenses: expensesReducer,
    shifts: shiftsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
