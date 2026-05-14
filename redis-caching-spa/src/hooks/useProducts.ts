/**
 * useProducts.ts
 *
 * React Feature #8 – Custom Hook
 *
 * Encapsulates all product CRUD operations.
 * Consumers get typed actions without touching context internals directly.
 */

import { useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import type { CreateProductDto, UpdateProductDto } from '../types';
import { useProductsContext } from '../context/ProductsContext';

export function useProducts() {
  const { state, dispatch } = useProductsContext();

  // React Feature #7 – useCallback: stable function references so child
  // components that receive these as props don't re-render unnecessarily.

  const fetchProducts = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const products = await apiClient.getProducts();
      dispatch({ type: 'FETCH_SUCCESS', payload: products, source: 'api' });
    } catch (e) {
      dispatch({ type: 'FETCH_ERROR', payload: String(e) });
    }
  }, [dispatch]);

  const createProduct = useCallback(
    async (dto: CreateProductDto) => {
      const product = await apiClient.createProduct(dto);
      dispatch({ type: 'ADD_PRODUCT', payload: product });
      return product;
    },
    [dispatch]
  );

  const updateProduct = useCallback(
    async (id: number, dto: UpdateProductDto) => {
      const product = await apiClient.updateProduct(id, dto);
      dispatch({ type: 'UPDATE_PRODUCT', payload: product });
      return product;
    },
    [dispatch]
  );

  const deleteProduct = useCallback(
    async (id: number) => {
      await apiClient.deleteProduct(id);
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
    },
    [dispatch]
  );

  return {
    products: state.products,
    source: state.source,
    lastRefreshed: state.lastRefreshed,
    isLoading: state.isLoading,
    error: state.error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
