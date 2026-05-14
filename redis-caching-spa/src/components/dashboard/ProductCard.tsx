/**
 * ProductCard.tsx
 *
 * React Feature #2 – Functional Component.
 * React Feature #7 – useCallback for stable onEdit/onDelete handlers.
 */

import { useCallback } from 'react';
import type { Product } from '../../types';

interface Props {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export function ProductCard({ product, onEdit, onDelete }: Props) {
  const handleEdit = useCallback(() => onEdit(product), [product, onEdit]);
  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete "${product.name}"?`)) onDelete(product.id);
  }, [product, onDelete]);

  return (
    <div className="product-card">
      <div className="product-card__header">
        <h4 className="product-card__name">{product.name}</h4>
        <span className="product-card__category">{product.category}</span>
      </div>

      <div className="product-card__details">
        <span className="product-card__price">${product.price.toFixed(2)}</span>
        <span className="product-card__stock">Stock: {product.stockQuantity}</span>
      </div>

      <p className="product-card__updated">
        Updated: {new Date(product.lastUpdated).toLocaleString()}
      </p>

      <div className="product-card__actions">
        <button className="btn btn-sm btn-secondary" onClick={handleEdit}>
          Edit
        </button>
        <button className="btn btn-sm btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
