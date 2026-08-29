// Maps Product.status values to color + Albanian label, matching the
// exact colors specified for this entity: Ne magazine=neutral gray,
// Ne perdorim=green, Ne riparim=amber, Jashte perdorimit=red. Kept
// separate from the AssetUnit StatusBadge — different enum, different
// domain, don't conflate the two even though the visual pattern matches.
const PRODUCT_STATUS_MAP = {
  "Ne magazine": {
    label: "Në magazinë",
    bg: "bg-gray-100",
    text: "text-gray-700",
  },
  "Ne perdorim": {
    label: "Në përdorim",
    bg: "bg-green-100",
    text: "text-green-800",
  },
  "Ne riparim": {
    label: "Në riparim",
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  "Jashte perdorimit": {
    label: "Jashtë përdorimit",
    bg: "bg-red-100",
    text: "text-red-800",
  },
};

export default function ProductStatusBadge({ status }) {
  const config = PRODUCT_STATUS_MAP[status] ?? {
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

export { PRODUCT_STATUS_MAP };
