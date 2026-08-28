import StockBadge from "../../StockBadge";
import { cardClasses } from "../../../lib/ui";

export default function ProductTable({ products, onEdit, onDelete }) {
  return (
    <div className={`${cardClasses} p-0 overflow-hidden`}>
      <table className="w-full text-left">
        <thead className="bg-surface-sunken border-b border-surface-border">
          <tr>
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
              SKU
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
              Furnitori
            </th>
            <th scope="col" className="px-4 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p._id}
              className="border-b border-surface-border last:border-0"
            >
              <td className="px-4 py-2 text-body text-gray-900">
                <div className="flex items-center gap-2">
                  {p.name}
                  <StockBadge stock={p.stock} />
                </div>
              </td>
              <td className="px-4 py-2 text-body text-gray-600">{p.sku}</td>
              <td className="px-4 py-2 text-body text-gray-600">
                {p.category?.name ?? "—"}
              </td>
              <td className="px-4 py-2 text-body text-gray-600">
                {p.supplier?.name ?? "—"}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  type="button"
                  className="text-meta text-accent-600 underline mr-3"
                  onClick={() => onEdit(p)}
                >
                  Ndrysho
                </button>
                <button
                  type="button"
                  className="text-meta text-status-danger underline"
                  onClick={() => onDelete(p._id)}
                >
                  Fshi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
