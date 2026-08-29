import ProductStatusBadge from "../../ProductStatusBadge";
import GroupActionsBar from "../../GroupActionsBar";

export default function GroupRow({ group, employees, actions }) {
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
      <GroupActionsBar group={group} employees={employees} {...actions} />
    </div>
  );
}
