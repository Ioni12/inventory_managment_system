// Maps backend status values to color + human label in one place.
// Table rows and the asset detail modal both import this — never
// re-derive the color/label pairing anywhere else.
const STATUS_MAP = {
  in_stock: {
    label: "In stock",
    color: "status-neutral",
    bg: "bg-gray-100",
    text: "text-gray-700",
  },
  assigned: {
    label: "Assigned",
    color: "status-success",
    bg: "bg-green-100",
    text: "text-green-800",
  },
  in_repair: {
    label: "In repair",
    color: "status-warning",
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  decommissioned: {
    label: "Decommissioned",
    color: "status-danger",
    bg: "bg-red-100",
    text: "text-red-800",
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    bg: "bg-gray-100",
    text: "text-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-app px-2.5 py-0.5 text-meta font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

export { STATUS_MAP };
