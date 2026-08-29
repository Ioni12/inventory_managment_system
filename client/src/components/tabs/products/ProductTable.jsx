import ProductStatusBadge from "../../ProductStatusBadge";
import StockBadge from "../../StockBadge";
import { cardClasses } from "../../../lib/ui";

/**
 * Rule #5: progressive disclosure — only Asset ID, name, category, status,
 * stock shown in the row. Serial/branding/supplier/price/description live
 * behind the row click (ProductDetailModal).
 * Rule #10: table on md+, stacked cards below — same actions in both.
 */
export default function ProductTable({ products, onView }) {
  return (
    <>
      <div className={`${cardClasses} hidden md:block p-0 overflow-hidden`}>
        <table className="w-full text-left">
          <thead className="bg-surface-sunken border-b border-surface-border">
            <tr>
              <th
                scope="col"
                className="px-4 py-2 text-meta font-medium text-gray-500"
              >
                Asset ID
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-meta font-medium text-gray-500"
              >
                Emri
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-meta font-medium text-gray-500"
              >
                Kategoria
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-meta font-medium text-gray-500"
              >
                Statusi
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-meta font-medium text-gray-500"
              >
                Stoku
              </th>
              <th scope="col" className="px-4 py-2">
                <span className="sr-only">Veprime</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p._id}
                className="border-b border-surface-border last:border-0 hover:bg-surface-sunken"
              >
                <td className="px-4 py-2 text-meta text-gray-500">
                  {p.assetId}
                </td>
                <td className="px-4 py-2 text-body text-gray-900">
                  <button
                    type="button"
                    className="hover:underline text-left"
                    onClick={() => onView(p)}
                  >
                    {p.name}
                  </button>
                </td>
                <td className="px-4 py-2 text-body text-gray-600">
                  {p.category?.name ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <ProductStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-body text-gray-700">
                      {p.stock ?? "—"}
                    </span>
                    <StockBadge stock={p.stock} />
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    className="text-meta text-accent-600 underline"
                    onClick={() => onView(p)}
                  >
                    Shiko
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {products.map((p) => (
          <div key={p._id} className={`${cardClasses} p-4`}>
            <div className="flex items-start justify-between mb-2">
              <button
                type="button"
                className="text-body font-medium text-gray-900 hover:underline text-left"
                onClick={() => onView(p)}
              >
                {p.name}
              </button>
              <ProductStatusBadge status={p.status} />
            </div>
            <p className="text-meta text-gray-500 mb-1">{p.assetId}</p>
            <p className="text-body text-gray-600 mb-1">
              {p.category?.name ?? "—"}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-body text-gray-700">{p.stock ?? "—"}</span>
              <StockBadge stock={p.stock} />
            </div>
            <button
              type="button"
              className="text-meta text-accent-600 underline mt-3"
              onClick={() => onView(p)}
            >
              Shiko detajet
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
