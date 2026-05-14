/**
 * Dashboard.tsx
 *
 * React Feature #3  – useState for modal/editing state
 * React Feature #4  – useContext (via useProductsContext)
 * React Feature #8  – Custom hooks: useProducts, useProductHub, useNotification
 * React Feature #10 – React.Suspense boundary (wraps the lazy CachingInfo section)
 */

import { useCallback, useEffect, useState } from 'react';
import type { Product } from '../../types';
import { useProducts } from '../../hooks/useProducts';
import { useProductHub } from '../../hooks/useProductHub';
import { useNotification } from '../../hooks/useNotification';
import { ProductList } from './ProductList';
import { ProductForm } from './ProductForm';
import { Modal } from '../common/Modal';
import { NotificationContainer } from '../common/Notification';

type DataSourceLabel = {
  label: string;
  color: string;
};

const sourceLabels: Record<string, DataSourceLabel> = {
  loading:   { label: '⏳ Loading…',          color: '#888' },
  api:       { label: '🌐 From API',            color: '#3b82f6' },
  cache:     { label: '⚡ From Cache',          color: '#10b981' },
  websocket: { label: '🔴 WebSocket Update',    color: '#f59e0b' },
};

export function Dashboard() {
  const {
    products,
    source,
    lastRefreshed,
    isLoading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProducts();

  const { notifications, addNotification, removeNotification } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Connect SignalR and wire dispatch into context
  useProductHub();

  // Fetch on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openCreateModal = useCallback(() => {
    setEditingProduct(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingProduct(null);
  }, []);

  const handleSubmit = useCallback(
    async (dto: Parameters<typeof createProduct>[0]) => {
      try {
        if (editingProduct) {
          await updateProduct(editingProduct.id, dto);
          addNotification(`"${dto.name}" updated successfully.`, 'success');
        } else {
          await createProduct(dto);
          addNotification(`"${dto.name}" created successfully.`, 'success');
        }
        closeModal();
      } catch (e) {
        addNotification(String(e), 'error');
      }
    },
    [editingProduct, createProduct, updateProduct, addNotification, closeModal]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteProduct(id);
        addNotification('Product deleted.', 'info');
      } catch (e) {
        addNotification(String(e), 'error');
      }
    },
    [deleteProduct, addNotification]
  );

  const src = sourceLabels[source] ?? sourceLabels['api'];

  return (
    <section className="dashboard" aria-label="Product Dashboard">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="dashboard__header">
        <div>
          <h2>📦 Product Dashboard</h2>
          <p className="dashboard__subtitle">
            CRUD operations with real-time WebSocket updates and Redis caching.
          </p>
        </div>

        <div className="dashboard__meta">
          <span
            className="source-badge"
            style={{ background: src.color }}
            title="Where the current data came from"
          >
            {src.label}
          </span>
          {lastRefreshed && (
            <span className="dashboard__refreshed">
              Last refresh: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────── */}
      <div className="dashboard__actions">
        <button className="btn btn-primary" onClick={openCreateModal}>
          + New Product
        </button>
        <button className="btn btn-secondary" onClick={fetchProducts} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : '↺ Refresh'}
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="dashboard__error" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="dashboard__stats">
        <div className="stat-card">
          <span className="stat-value">{products.length}</span>
          <span className="stat-label">Products</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            ${products.reduce((s, p) => s + p.price, 0).toFixed(2)}
          </span>
          <span className="stat-label">Total Value</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {products.reduce((s, p) => s + p.stockQuantity, 0)}
          </span>
          <span className="stat-label">Total Stock</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {new Set(products.map((p) => p.category)).size}
          </span>
          <span className="stat-label">Categories</span>
        </div>
      </div>

      {/* ── Product list ───────────────────────────────────────────── */}
      {isLoading && products.length === 0 ? (
        <p className="dashboard__loading">Loading products…</p>
      ) : (
        <ProductList
          products={products}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      )}

      {/* ── Create / Edit modal ────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? `Edit: ${editingProduct.name}` : 'Create New Product'}
      >
        <ProductForm
          product={editingProduct}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </section>
  );
}
