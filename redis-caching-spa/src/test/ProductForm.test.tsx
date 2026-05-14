/**
 * ProductForm.test.tsx
 *
 * Test matrix:
 * | Test                             | Covers                               |
 * |----------------------------------|--------------------------------------|
 * | renders empty form for create    | Form initial state                   |
 * | pre-fills form when editing      | useEffect populating form            |
 * | shows error on empty name        | Validation: required name            |
 * | shows error on zero price        | Validation: price > 0                |
 * | calls onSubmit with valid data   | Happy path form submission           |
 * | calls onCancel when cancelled    | Cancel button handler                |
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductForm } from '../components/dashboard/ProductForm';
import type { Product } from '../types';

const editProduct: Product = {
  id: 1, name: 'Existing Widget', price: 19.99,
  category: 'Gadgets', stockQuantity: 5,
  lastUpdated: new Date().toISOString(),
};

describe('ProductForm', () => {
  it('renders empty fields when no product provided', () => {
    render(<ProductForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByPlaceholderText(/Laptop Pro/i) as HTMLInputElement).value).toBe('');
  });

  it('pre-fills form when editing an existing product', () => {
    render(<ProductForm product={editProduct} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByPlaceholderText(/Laptop Pro/i) as HTMLInputElement).value).toBe('Existing Widget');
  });

  it('shows validation error when name is empty', async () => {
    render(<ProductForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /create product/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/name is required/i);
  });

  it('shows validation error when price is zero', async () => {
    render(<ProductForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Laptop Pro/i), { target: { value: 'Widget' } });
    fireEvent.click(screen.getByRole('button', { name: /create product/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/price must be greater/i);
  });

  it('calls onSubmit with correct data on valid submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProductForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Laptop Pro/i), { target: { value: 'New Item' } });
    // Use label text to disambiguate price from stockQuantity (both default to 0)
    fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: '29.99' } });

    fireEvent.click(screen.getByRole('button', { name: /create product/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Item', price: 29.99 })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ProductForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
