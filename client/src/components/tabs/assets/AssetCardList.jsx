import StatusBadge from "../../StatusBadge";
import { cardClasses } from "../../../lib/ui";

/**
 * Mobile card list — same data, same actions as AssetTable, no navigating
 * elsewhere (rule #10 mobile continuity).
 */
export default function AssetCardList({ assets, onView, onQuickStatus }) {
  return (
    <div className="md:hidden flex flex-col gap-3">
      {assets.map((a) => (
        <div key={a._id} className={`${cardClasses} p-4`}>
          <div className="flex items-start justify-between mb-2">
            <button
              type="button"
              className="text-body font-medium text-gray-900 hover:underline text-left"
              onClick={() => onView(a)}
            >
              {a.assetCode}
            </button>
            <StatusBadge status={a.status} />
          </div>
          <p className="text-body text-gray-600 mb-1">{a.productName}</p>
          <p className="text-meta text-gray-500">
            {a.holderName || "Unassigned"} · {a.locationName || "No location"}
          </p>
          <div className="flex gap-4 mt-3">
            {a.status === "in_repair" && (
              <button
                type="button"
                className="text-meta text-accent-600 underline"
                onClick={() => onQuickStatus(a, "in_stock")}
              >
                Mark repaired
              </button>
            )}
            <button
              type="button"
              className="text-meta text-accent-600 underline"
              onClick={() => onView(a)}
            >
              View
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
