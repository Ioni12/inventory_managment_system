export const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "damaged", label: "Damaged" },
];

export const STATUS_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "assigned", label: "Assigned" },
  { value: "in_repair", label: "In repair" },
  { value: "decommissioned", label: "Decommissioned" },
];

export const HOLDER_TYPE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "employee", label: "Employee" },
];

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const CREATE_DEFAULTS = {
  status: "in_stock",
  condition: "new",
  holderType: "none",
  purchaseDate: todayISO(),
};

// Rule #4: kill data-entry friction — sensible defaults for a new asset.
// Takes the currently-loaded reference lists so select options stay live.
export function buildAssetFields({ products, employees, locations }) {
  return [
    {
      name: "product",
      label: "Product",
      type: "select",
      required: true,
      options: products.map((p) => ({ value: p._id, label: p.name })),
    },
    { name: "assetCode", label: "Asset code", required: true },
    { name: "serial", label: "Serial" },
    { name: "iccid", label: "ICCID" },
    { name: "imei", label: "IMEI" },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: STATUS_OPTIONS,
    },
    {
      name: "condition",
      label: "Condition",
      type: "select",
      required: true,
      options: CONDITION_OPTIONS,
    },
    {
      name: "holderType",
      label: "Holder type",
      type: "select",
      options: HOLDER_TYPE_OPTIONS,
    },
    {
      name: "holder",
      label: "Holder",
      type: "select",
      options: employees.map((e) => ({
        value: e._id,
        label: `${e.firstName} ${e.lastName}`,
      })),
    },
    {
      name: "location",
      label: "Location",
      type: "select",
      options: locations.map((l) => ({ value: l._id, label: l.name })),
    },
    { name: "purchaseDate", label: "Purchase date", type: "date" },
    { name: "warrantyUntil", label: "Warranty until", type: "date" },
    { name: "accessories", label: "Accessories" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}
