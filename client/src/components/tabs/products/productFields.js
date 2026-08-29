export const PRODUCT_STATUS_OPTIONS = [
  { value: "Ne magazine", label: "Në magazinë" },
  { value: "Ne perdorim", label: "Në përdorim" },
  { value: "Ne riparim", label: "Në riparim" },
  { value: "Jashte perdorimit", label: "Jashtë përdorimit" },
];

export const PRODUCT_CREATE_DEFAULTS = {
  status: "Ne magazine",
  unit: "piece",
};

// Deliberately excludes `assetId` — it's backend-generated and read-only
// (shown separately in the modal title / detail view), never rendered as
// an editable Modal field so it can never be included in onSubmit(values).
export const PRODUCT_FIELDS = [
  { name: "name", label: "Emri", required: true },
  {
    name: "category",
    label: "Kategoria",
    type: "select",
    required: true,
    options: [],
  }, // populated at render
  { name: "serial", label: "Nr. Serial" },
  { name: "branding", label: "Branding" },
  { name: "stock", label: "Stoku", type: "number" },
  { name: "unit", label: "Njësia" },
  {
    name: "supplier",
    label: "Furnitori",
    type: "select",
    options: [],
  }, // populated at render
  { name: "purchasePrice", label: "Çmimi i blerjes", type: "number" },
  {
    name: "status",
    label: "Statusi",
    type: "select",
    required: true,
    options: PRODUCT_STATUS_OPTIONS,
  },
  { name: "description", label: "Përshkrimi", type: "textarea" },
];

// Fills in the live category/supplier options — kept as a function since it
// depends on data loaded at render time, not static config.
export function buildProductFields({ categories, suppliers }) {
  return PRODUCT_FIELDS.map((f) => {
    if (f.name === "category")
      return {
        ...f,
        options: categories.map((c) => ({ value: c._id, label: c.name })),
      };
    if (f.name === "supplier")
      return {
        ...f,
        options: suppliers.map((s) => ({ value: s._id, label: s.name })),
      };
    return f;
  });
}
