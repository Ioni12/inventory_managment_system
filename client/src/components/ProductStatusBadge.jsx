// Maps a group's status value to color + Albanian label. Status now lives
// on groups (a Product batch has no single status of its own), but the
// same 4-value enum and exact colors apply: Ne magazine=neutral gray,
// Ne perdorim=green, Ne riparim=amber, Jashte perdorimit=red.
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
