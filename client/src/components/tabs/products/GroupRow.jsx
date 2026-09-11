import { useState } from "react";
import ProductStatusBadge from "../../ProductStatusBadge";
import GroupActionsBar from "../../GroupActionsBar";
import SerialsPanel from "./SerialsPanel";

export default function GroupRow({
  productId,
  group,
  employees,
  actions,
  onSerialsChanged,
}) {
  const [managingSerials, setManagingSerials] = useState(false);

  const serials = group.serials ?? [];
  const hasSerials = serials.length > 0;
  const anonymousCount = group.quantity - serials.length;

  return (
    <div className="flex flex-col gap-2 py-3 px-4 border-b border-surface-border last:border-0 bg-surface-sunken">
      <div className="flex flex-wrap items-center gap-3">
        <ProductStatusBadge status={group.status} />
        <span className="text-body text-gray-700">
          {group.currentHolder
            ? `${group.currentHolder.firstName} ${group.currentHolder.lastName}`
            : "Pa caktuar"}
        </span>
        <span className="text-meta text-gray-500 ml-auto">
          {group.quantity} {group.quantity === 1 ? "njësi" : "njësi"}
        </span>
      </div>

      {/* Serials: stays invisible for the common case (no serials tagged) */}
      {hasSerials && (
        <div className="text-meta text-gray-500">
          Seriale:{" "}
          <span className="font-mono text-gray-700">{serials.join(", ")}</span>
          {anonymousCount > 0 && ` (+${anonymousCount} pa serial)`}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <GroupActionsBar group={group} employees={employees} {...actions} />
        <button
          type="button"
          className="text-meta text-gray-500 underline"
          onClick={() => setManagingSerials((v) => !v)}
        >
          {managingSerials ? "Mbyll serialet" : "Menaxho serialet"}
        </button>
      </div>

      {managingSerials && (
        <SerialsPanel
          productId={productId}
          group={group}
          onClose={() => setManagingSerials(false)}
          onUpdated={onSerialsChanged}
        />
      )}
    </div>
  );
}
