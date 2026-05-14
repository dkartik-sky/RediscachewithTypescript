// ─── Domain types ──────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stockQuantity: number;
  lastUpdated: string;
}

export type CreateProductDto = Omit<Product, 'id' | 'lastUpdated'>;
export type UpdateProductDto = Omit<Product, 'id' | 'lastUpdated'>;

// ─── Cache state metadata ───────────────────────────────────────────────────

export type DataSource = 'loading' | 'api' | 'cache' | 'websocket';

export interface ProductsState {
  products: Product[];
  source: DataSource;
  lastRefreshed: Date | null;
  isLoading: boolean;
  error: string | null;
}

export type ProductAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Product[]; source: DataSource }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: number }
  | { type: 'WEBSOCKET_UPDATE'; payload: Product }
  | { type: 'WEBSOCKET_DELETE'; payload: number };

// ─── Notification ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}
