/**
 * ProductsContext.tsx
 *
 * React Feature #9 – Context API + #5 useReducer
 *
 * Provides app-wide in-memory state for products.
 * useReducer handles complex multi-branch state transitions
 * (vs plain useState which would require nested spread operations).
 */

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import type { ProductAction, ProductsState } from '../types';

// ─── Reducer ───────────────────────────────────────────────────────────────

const initialState: ProductsState = {
  products: [],
  source: 'loading',
  lastRefreshed: null,
  isLoading: false,
  error: null,
};

function productsReducer(state: ProductsState, action: ProductAction): ProductsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        products: action.payload,
        source: action.source,
        lastRefreshed: new Date(),
        isLoading: false,
        error: null,
      };

    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };

    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.payload],
        source: 'api',
        lastRefreshed: new Date(),
      };

    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
        source: 'api',
        lastRefreshed: new Date(),
      };

    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
        source: 'api',
        lastRefreshed: new Date(),
      };

    case 'WEBSOCKET_UPDATE':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ).concat(
          // Add if not already in list (new product from another tab)
          state.products.some((p) => p.id === action.payload.id) ? [] : [action.payload]
        ),
        source: 'websocket',
        lastRefreshed: new Date(),
      };

    case 'WEBSOCKET_DELETE':
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
        source: 'websocket',
        lastRefreshed: new Date(),
      };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

interface ProductsContextValue {
  state: ProductsState;
  dispatch: React.Dispatch<ProductAction>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(productsReducer, initialState);

  return (
    <ProductsContext.Provider value={{ state, dispatch }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsContext() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProductsContext must be used inside ProductsProvider');
  return ctx;
}
