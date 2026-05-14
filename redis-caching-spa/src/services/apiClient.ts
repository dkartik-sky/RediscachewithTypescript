/**
 * apiClient.ts
 *
 * Wraps all HTTP calls to the .NET Web API.
 * Uses axios for cleaner error handling and interceptors.
 */

import axios from 'axios';
import type { CreateProductDto, Product, UpdateProductDto } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5168';

const http = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor: unwrap errors into plain messages
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message: string =
      err.response?.data ?? err.message ?? 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

export const apiClient = {
  getProducts: (): Promise<Product[]> =>
    http.get<Product[]>('/products').then((r) => r.data),

  getProductById: (id: number): Promise<Product> =>
    http.get<Product>(`/products/${id}`).then((r) => r.data),

  createProduct: (dto: CreateProductDto): Promise<Product> =>
    http.post<Product>('/products', dto).then((r) => r.data),

  updateProduct: (id: number, dto: UpdateProductDto): Promise<Product> =>
    http.put<Product>(`/products/${id}`, dto).then((r) => r.data),

  deleteProduct: (id: number): Promise<void> =>
    http.delete(`/products/${id}`).then(() => undefined),
};
