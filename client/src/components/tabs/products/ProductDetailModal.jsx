import ProductStatusBadge from "../../ProductStatusBadge";
import StockBadge from "../../StockBadge";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  modalOverlayClasses,
  modalPanelClasses,
} from "../../../lib/ui";
import { PRODUCT_STATUS_OPTIONS } from "./productFields";

/**
 * Rule #2: one screen, one decision — status, stock, category, supplier,
 * and purchase price shown together, no navigating elsewhere to decide
 * "is this in good shape / do we have enough / what's it worth."
 */
export default function ProductDetailModal({
  product,
  onClose,
  onEdit,
  onDelete,
  onQuickStatus,
}) {
  return (
    <div
      className={modalOverlayClasses}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        className={modalPanelClasses}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 id="product-detail-title" className="text-heading text-gray-900">
            {product.name}
          </h2>
          <ProductStatusBadge status={product.status} />
        </div>
        <p className="text-meta text-gray-500 mb-4">{product.assetId}</p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
          <div>
            <dt className="text-meta text-gray-500">Kategoria</dt>
            <dd className="text-body text-gray-900">
              {product.category?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Furnitori</dt>
            <dd className="text-body text-gray-900">
              {product.supplier?.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Stoku</dt>
            <dd className="text-body text-gray-900 flex items-center gap-2">
              {product.stock ?? "—"} {product.unit}
              <StockBadge stock={product.stock} />
            </dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Çmimi i blerjes</dt>
            <dd className="text-body text-gray-900">
              {product.purchasePrice != null ? product.purchasePrice : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Nr. Serial</dt>
            <dd className="text-body text-gray-900">{product.serial || "—"}</dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Branding</dt>
            <dd className="text-body text-gray-900">
              {product.branding || "—"}
            </dd>
          </div>
          {product.description && (
            <div className="col-span-2">
              <dt className="text-meta text-gray-500">Përshkrimi</dt>
              <dd className="text-body text-gray-900">{product.description}</dd>
            </div>
          )}
        </dl>

        {/* Rule #4: one-click status changes without opening the full edit form */}
        <div className="mb-6">
          <p className="text-meta text-gray-500 mb-2">Ndrysho statusin</p>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.value === product.status}
                onClick={() => onQuickStatus(product, opt.value)}
                className={`${buttonSecondaryClasses} text-meta py-1 disabled:opacity-40`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="text-meta text-status-danger underline mr-auto"
            onClick={() => onDelete(product._id)}
          >
            Fshi
          </button>
          <button
            type="button"
            className={buttonSecondaryClasses}
            onClick={onClose}
          >
            Mbyll
          </button>
          <button
            type="button"
            className={buttonPrimaryClasses}
            onClick={() => onEdit(product)}
          >
            Ndrysho
          </button>
        </div>
      </div>
    </div>
  );
}
