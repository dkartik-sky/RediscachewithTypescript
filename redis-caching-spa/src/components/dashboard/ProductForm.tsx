/**
 * ProductForm.tsx
 *
 * React Feature #3 – useState + useEffect for form state management.
 * React Feature #7 – useCallback for stable submit handler.
 */

import { useCallback, useEffect, useState } from 'react';
import type { CreateProductDto, Product, UpdateProductDto } from '../../types';

interface Props {
  product?: Product | null;
  onSubmit: (dto: CreateProductDto | UpdateProductDto) => Promise<void>;
  onCancel: () => void;
}

const empty: CreateProductDto = {
  name: '',
  price: 0,
  category: '',
  stockQuantity: 0,
};

export function ProductForm({ product, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<CreateProductDto>(empty);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Populate form when editing an existing product
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        price: product.price,
        category: product.category,
        stockQuantity: product.stockQuantity,
      });
    } else {
      setForm(empty);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name.trim()) {
        setValidationError('Name is required.');
        return;
      }
      if (form.price <= 0) {
        setValidationError('Price must be greater than 0.');
        return;
      }
      setValidationError('');
      setIsSubmitting(true);
      try {
        await onSubmit(form);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, onSubmit]
  );

  return (
    <form className="product-form" onSubmit={handleSubmit} noValidate>
      {validationError && (
        <div className="form-error" role="alert">{validationError}</div>
      )}

      <label>
        Name
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Laptop Pro"
          required
        />
      </label>

      <label>
        Price ($)
        <input
          name="price"
          type="number"
          min="0.01"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          required
        />
      </label>

      <label>
        Category
        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="e.g. Electronics"
        />
      </label>

      <label>
        Stock Quantity
        <input
          name="stockQuantity"
          type="number"
          min="0"
          value={form.stockQuantity}
          onChange={handleChange}
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Saving…' : product ? 'Update Product' : 'Create Product'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
