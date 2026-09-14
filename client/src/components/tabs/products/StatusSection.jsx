import ProductStatusBadge from "../../ProductStatusBadge";
import GroupRow from "./GroupRow";

// Fixed display order so sections don't jump around as data changes.
const STATUS_ORDER = [
  "Ne magazine",
  "Ne perdorim",
  "Ne riparim",
  "Jashte perdorimit",
];

/**
 * Groups within a product are bucketed by status only. Different holders
 * sharing the same status (e.g. two "Ne perdorim" groups for two
 * different employees) are NOT split into separate sections or
 * sub-blocks — they render as flat rows under one shared status header,
 * with the holder shown as a label on each row (inside GroupRow), same
 * as a serial number or quantity is shown per-row today.
 */
export default function StatusSection({
  productId,
  groups,
  employees,
  actions,
  onSerialsChanged,
}) {
  const byStatus = {};
  for (const g of groups) {
    (byStatus[g.status] ??= []).push(g);
  }

  const statuses = STATUS_ORDER.filter((s) => byStatus[s]?.length > 0);

  return (
    <>
      {statuses.map((status) => {
        const groupsForStatus = byStatus[status];
        const totalQty = groupsForStatus.reduce(
          (sum, g) => sum + g.quantity,
          0,
        );

        return (
          <div key={status}>
            <div className="flex items-center justify-between px-4 py-2 bg-surface-sunken border-b border-surface-border">
              <ProductStatusBadge status={status} />
              <span className="text-meta text-gray-500">
                {totalQty} {totalQty === 1 ? "njësi" : "njësi"}
              </span>
            </div>
            {groupsForStatus.map((g) => (
              <GroupRow
                key={g._id}
                productId={productId}
                group={g}
                employees={employees}
                actions={actions}
                onSerialsChanged={onSerialsChanged}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}
