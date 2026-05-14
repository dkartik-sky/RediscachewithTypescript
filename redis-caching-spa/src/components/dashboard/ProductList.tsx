/**
 * ProductList.tsx
 *
 * React Feature #6 – useMemo: derive filtered/searched list without re-running
 *                    filter on every render (only runs when products or query changes).
 * React Feature #3 – useState for the search query.
 */

import { useMemo, useState } from 'react';
import type { Product } from '../../types';
import { ProductCard } from './ProductCard';

interface Props {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export function ProductList({ products, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState('');

  // React Feature #6 – useMemo
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        )
      : products;
  }, [products, query]);

  return (
    <div className="product-list">
      <div className="product-list__search">
        <input
          type="search"
          placeholder="Search by name or category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
        <span className="product-list__count">
          {filtered.length} / {products.length} products
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="product-list__empty">
          {query ? 'No products match your search.' : 'No products yet. Create one!'}
        </p>
      ) : (
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
