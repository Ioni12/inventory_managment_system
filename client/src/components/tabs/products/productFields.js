// Deliberately excludes `assetId` (backend-generated, read-only, shown in
// the modal title instead) and any status/serial fields — those moved to
// the group model. This config is for batch-level fields only: name,
// category, branding, unit, supplier, purchase price, description.
export const PRODUCT_FIELDS = [
  { name: "name", label: "Emri", required: true },
  {
    name: "category",
    label: "Kategoria",
    type: "select",
    required: true,
    options: [],
  }, // populated at render
  { name: "branding", label: "Branding" },
  { name: "unit", label: "Njësia" },
  {
    name: "supplier",
    label: "Furnitori",
    type: "select",
    options: [],
  }, // populated at render
  { name: "purchasePrice", label: "Çmimi i blerjes", type: "number" },
  { name: "description", label: "Përshkrimi", type: "textarea" },
];

export const PRODUCT_CREATE_DEFAULTS = {
  unit: "piece",
};

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
