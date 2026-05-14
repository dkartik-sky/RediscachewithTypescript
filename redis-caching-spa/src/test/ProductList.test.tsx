/**
 * ProductList.test.tsx
 *
 * Test matrix:
 * | Test                                | Covers                               |
 * |-------------------------------------|--------------------------------------|
 * | renders all products                | Component: list rendering            |
 * | shows empty state                   | Component: empty list UI             |
 * | search filters by name              | useMemo filtered list                |
 * | search filters by category          | useMemo filtered list (category)     |
 * | shows count correctly               | Derived count display                |
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductList } from '../components/dashboard/ProductList';
import type { Product } from '../types';

const makeProduct = (id: number, name: string, category: string): Product => ({
  id, name, price: 9.99, category, stockQuantity: 10,
  lastUpdated: new Date().toISOString(),
});

const products = [
  makeProduct(1, 'Laptop Pro',    'Electronics'),
  makeProduct(2, 'Wireless Mouse','Electronics'),
  makeProduct(3, 'Desk Chair',    'Furniture'),
];

describe('ProductList', () => {
  it('renders all products', () => {
    render(<ProductList products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
    expect(screen.getByText('Desk Chair')).toBeInTheDocument();
  });

  it('shows empty message when list is empty', () => {
    render(<ProductList products={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/No products yet/i)).toBeInTheDocument();
  });

  it('filters products by name when searching', () => {
    render(<ProductList products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'laptop' } });
    expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    expect(screen.queryByText('Desk Chair')).not.toBeInTheDocument();
  });

  it('filters products by category when searching', () => {
    render(<ProductList products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'furniture' } });
    expect(screen.getByText('Desk Chair')).toBeInTheDocument();
    expect(screen.queryByText('Laptop Pro')).not.toBeInTheDocument();
  });

  it('shows no-match message when search has no results', () => {
    render(<ProductList products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'XXXXXXXXX' } });
    expect(screen.getByText(/No products match/i)).toBeInTheDocument();
  });

  it('displays filtered count correctly', () => {
    render(<ProductList products={products} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'electronics' } });
    expect(screen.getByText(/2 \/ 3 products/)).toBeInTheDocument();
  });
});
