import { Fragment, useState } from "react";
import StockBadge from "../../StockBadge";
import GroupRow from "./GroupRow";
import { cardClasses } from "../../../lib/ui";

/**
 * Rule #2 + #5: batch-level row shows Asset ID, name, category, stock,
 * availableStock/out-of-stock flag only. Expanding reveals the group
 * breakdown (status, holder, quantity, actions) inline — no navigating
 * elsewhere to answer "do we have enough / who has these."
 * Rule #10: accordion-style expansion works the same on mobile cards.
 */
export default function ProductTable({
  products,
  employees,
  onEdit,
  onDelete,
  groupActionsFor,
}) {
  const [expandedId, setExpandedId] = useState(null);

  function toggle(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

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
                Stoku
              </th>
              <th scope="col" className="px-4 py-2">
                <span className="sr-only">Veprime</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isOpen = expandedId === p._id;
              return (
                <Fragment key={p._id}>
                  <tr className="border-b border-surface-border last:border-0 hover:bg-surface-sunken">
                    <td className="px-4 py-2 text-meta text-gray-500">
                      {p.assetId}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-900">
                      <button
                        type="button"
                        className="hover:underline text-left"
                        onClick={() => toggle(p._id)}
                        aria-expanded={isOpen}
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {p.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-body text-gray-700">
                          {p.stock ?? 0}
                        </span>
                        <StockBadge availableStock={p.availableStock} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="text-meta text-accent-600 underline mr-3"
                        onClick={() => toggle(p._id)}
                      >
                        {isOpen ? "Mbyll grupet" : "Shiko grupet"}
                      </button>
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
                  {isOpen && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        {(p.groups ?? []).length === 0 ? (
                          <p className="text-meta text-gray-500 px-4 py-3 bg-surface-sunken">
                            Ky produkt nuk ka grupe ende.
                          </p>
                        ) : (
                          p.groups.map((g) => (
                            <GroupRow
                              key={g._id}
                              group={g}
                              employees={employees}
                              actions={groupActionsFor(p._id)}
                            />
                          ))
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {products.map((p) => {
          const isOpen = expandedId === p._id;
          return (
            <div key={p._id} className={`${cardClasses} p-0 overflow-hidden`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <button
                    type="button"
                    className="text-body font-medium text-gray-900 hover:underline text-left"
                    onClick={() => toggle(p._id)}
                    aria-expanded={isOpen}
                  >
                    {p.name}
                  </button>
                  <StockBadge availableStock={p.availableStock} />
                </div>
                <p className="text-meta text-gray-500 mb-1">{p.assetId}</p>
                <p className="text-body text-gray-600 mb-1">
                  {p.category?.name ?? "—"}
                </p>
                <p className="text-body text-gray-700 mb-3">
                  Stoku: {p.stock ?? 0}
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="text-meta text-accent-600 underline"
                    onClick={() => toggle(p._id)}
                  >
                    {isOpen ? "Mbyll grupet" : "Shiko grupet"}
                  </button>
                  <button
                    type="button"
                    className="text-meta text-accent-600 underline"
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
                </div>
              </div>
              {isOpen &&
                ((p.groups ?? []).length === 0 ? (
                  <p className="text-meta text-gray-500 px-4 py-3 bg-surface-sunken">
                    Ky produkt nuk ka grupe ende.
                  </p>
                ) : (
                  p.groups.map((g) => (
                    <GroupRow
                      key={g._id}
                      group={g}
                      employees={employees}
                      actions={groupActionsFor(p._id)}
                    />
                  ))
                ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
