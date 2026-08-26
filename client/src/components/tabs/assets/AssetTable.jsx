import StatusBadge from "../../StatusBadge";
import { cardClasses } from "../../../lib/ui";

/**
 * Rule #10: table on md+, stacked cards below (see AssetCardList) — same
 * actions available in both, not a stripped-down subset.
 */
export default function AssetTable({ assets, onView, onQuickStatus }) {
  return (
    <div className={`${cardClasses} hidden md:block p-0 overflow-hidden`}>
      <table className="w-full text-left">
        <thead className="bg-surface-sunken border-b border-surface-border">
          <tr>
            <th
              scope="col"
              className="px-4 py-2 text-meta font-medium text-gray-500"
            >
              Asset code
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-meta font-medium text-gray-500"
            >
              Product
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-meta font-medium text-gray-500"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-meta font-medium text-gray-500"
            >
              Holder
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-meta font-medium text-gray-500"
            >
              Location
            </th>
            <th scope="col" className="px-4 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr
              key={a._id}
              className="border-b border-surface-border last:border-0 hover:bg-surface-sunken"
            >
              <td className="px-4 py-2 text-body text-gray-900">
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => onView(a)}
                >
                  {a.assetCode}
                </button>
              </td>
              <td className="px-4 py-2 text-body text-gray-600">
                {a.productName}
              </td>
              <td className="px-4 py-2">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-2 text-body text-gray-600">
                {a.holderName || "—"}
              </td>
              <td className="px-4 py-2 text-body text-gray-600">
                {a.locationName || "—"}
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                {a.status === "in_repair" && (
                  <button
                    type="button"
                    className="text-meta text-accent-600 underline mr-3"
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
