import StatusBadge from "../../StatusBadge";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  modalOverlayClasses,
  modalPanelClasses,
} from "../../../lib/ui";

/**
 * Rule #2: one screen, one decision — everything needed to act on this
 * asset (status, holder, location, warranty, condition) shown together,
 * no navigating elsewhere.
 */
export default function AssetDetailModal({
  asset,
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
        aria-labelledby="detail-title"
        className={modalPanelClasses}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="detail-title" className="text-heading text-gray-900">
            {asset.assetCode}
          </h2>
          <StatusBadge status={asset.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
          <div>
            <dt className="text-meta text-gray-500">Product</dt>
            <dd className="text-body text-gray-900">{asset.productName}</dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Condition</dt>
            <dd className="text-body text-gray-900 capitalize">
              {asset.condition}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Holder</dt>
            <dd className="text-body text-gray-900">
              {asset.holderName || "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Location</dt>
            <dd className="text-body text-gray-900">
              {asset.locationName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Serial</dt>
            <dd className="text-body text-gray-900">{asset.serial || "—"}</dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">IMEI</dt>
            <dd className="text-body text-gray-900">{asset.imei || "—"}</dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Warranty until</dt>
            <dd className="text-body text-gray-900">
              {asset.warrantyUntil?.slice(0, 10) || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-meta text-gray-500">Purchase date</dt>
            <dd className="text-body text-gray-900">
              {asset.purchaseDate?.slice(0, 10) || "—"}
            </dd>
          </div>
          {asset.accessories && (
            <div className="col-span-2">
              <dt className="text-meta text-gray-500">Accessories</dt>
              <dd className="text-body text-gray-900">{asset.accessories}</dd>
            </div>
          )}
          {asset.notes && (
            <div className="col-span-2">
              <dt className="text-meta text-gray-500">Notes</dt>
              <dd className="text-body text-gray-900">{asset.notes}</dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap justify-end gap-3">
          {asset.status === "in_repair" && (
            <button
              type="button"
              className={buttonSecondaryClasses}
              onClick={() => onQuickStatus(asset, "in_stock")}
            >
              Mark repaired
            </button>
          )}
          <button
            type="button"
            className="text-meta text-status-danger underline mr-auto"
            onClick={() => onDelete(asset._id)}
          >
            Delete
          </button>
          <button
            type="button"
            className={buttonSecondaryClasses}
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className={buttonPrimaryClasses}
            onClick={() => onEdit(asset)}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
