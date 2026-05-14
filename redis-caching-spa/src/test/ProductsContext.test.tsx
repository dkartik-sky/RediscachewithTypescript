/**
 * ProductsContext.test.tsx
 *
 * Tests the reducer logic and context integration.
 *
 * Test matrix:
 * | Test                                   | Covers                                    |
 * |----------------------------------------|-------------------------------------------|
 * | initial state                          | Context initial values                    |
 * | FETCH_SUCCESS sets products            | Reducer: fetch happy path                 |
 * | ADD_PRODUCT appends to list            | Reducer: optimistic add                   |
 * | UPDATE_PRODUCT mutates correct item    | Reducer: in-place update                  |
 * | DELETE_PRODUCT removes correct item    | Reducer: removal by id                    |
 * | WEBSOCKET_UPDATE merges new product    | Reducer: real-time add from WebSocket     |
 * | WEBSOCKET_DELETE removes product       | Reducer: real-time delete from WebSocket  |
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductsProvider, useProductsContext } from '../context/ProductsContext';
import type { Product } from '../types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProductsProvider>{children}</ProductsProvider>
);

const makeProduct = (id: number, name = `Product ${id}`): Product => ({
  id, name, price: id * 10, category: 'Test', stockQuantity: id * 5,
  lastUpdated: new Date().toISOString(),
});

describe('ProductsContext reducer', () => {
  it('starts with empty products and loading source', () => {
    const { result } = renderHook(() => useProductsContext(), { wrapper });
    expect(result.current.state.products).toHaveLength(0);
    expect(result.current.state.source).toBe('loading');
  });

  it('FETCH_SUCCESS replaces products and sets source', () => {
    const { result } = renderHook(() => useProductsContext(), { wrapper });
    const products = [makeProduct(1), makeProduct(2)];

    act(() => {
      result.current.dispatch({ type: 'FETCH_SUCCESS', payload: products, source: 'api' });
    });

    expect(result.current.state.products).toHaveLength(2);
    expect(result.current.state.source).toBe('api');
    expect(result.current.state.isLoading).toBe(false);
  });

  it('ADD_PRODUCT appends a new product', () => {
    const { result } = renderHook(() => useProductsContext(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'FETCH_SUCCESS', payload: [makeProduct(1)], source: 'api' });
      result.current.dispatch({ type: 'ADD_PRODUCT', payload: makeProduct(2) });
    });

    expect(result.current.state.products).toHaveLength(2);
    expect(result.current.state.products[1].id).toBe(2);
  });

  it('UPDATE_PRODUCT replaces only the matching product', () => {
    const { result } = renderHook(() => useProductsContext(), { wrapper });
    const updated = makeProduct(1, 'Updated!');

    act(() => {
      result.current.dispatch({ type: 'FETCH_SUCCESS', payload: [makeProduct(1), makeProduct(2)], source: 'api' });
      result.current.dispatch({ type: 'UPDATE_PRODUCT', payload: updated });
    });

    const found = result.current.state.products.find((p) => p.id === 1);
    expect(found?.name).toBe('Updated!');
    expect(result.current.state.products).toHaveLength(2);
  });

  it('DELETE_PRODUCT removes only the matching product', () => {
    const { result } = renderHook(() => useProductsContext(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'FETCH_SUCCESS', payload: [makeProduct(1), makeProduct(2)], source: 'api' });
      result.current.dispatch({ type: 'DELETE_PRODUCT', payload: 1 });
    });

    expect(result.current.state.products).toHaveLength(1);
    expect(result.current.state.products[0].id).toBe(2);
  });

  it('WEBSOCKET_UPDATE adds a new product if not present', () => {
    const { result } = renderHook(() => useProductsContext(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'FETCH_SUCCESS', payload: [makeProduct(1)], source: 'api' });
      result.current.dispatch({ type: 'WEBSOCKET_UPDATE', payload: makeProduct(99, 'Real-time!') });
    });

    expect(result.current.state.products).toHaveLength(2);
    expect(result.current.state.source).toBe('websocket');
  });

  it('WEBSOCKET_DELETE removes the product and sets source to websocket', () => {
    const { result } = renderHook(() => useProductsContext(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'FETCH_SUCCESS', payload: [makeProduct(1), makeProduct(2)], source: 'api' });
      result.current.dispatch({ type: 'WEBSOCKET_DELETE', payload: 1 });
    });

    expect(result.current.state.products).toHaveLength(1);
    expect(result.current.state.source).toBe('websocket');
  });
});
