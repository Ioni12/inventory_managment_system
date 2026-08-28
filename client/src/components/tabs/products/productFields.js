export const PRODUCT_FIELDS = [
  { name: "name", label: "Emri", required: true },
  { name: "type", label: "Lloji", required: true },
  { name: "sku", label: "SKU", required: true },
  {
    name: "category",
    label: "Kategoria",
    type: "select",
    required: true,
    options: [],
  }, // populated at render
  {
    name: "supplier",
    label: "Furnitori",
    type: "select",
    required: true,
    options: [],
  }, // populated at render
  { name: "unit", label: "Njësia", required: true },
  { name: "purchasePrice", label: "Çmimi i blerjes", type: "number" },
  { name: "salePrice", label: "Çmimi i shitjes", type: "number" },
  { name: "minStock", label: "Stoku minimal", type: "number" },
  { name: "stock", label: "Stoku", type: "number" },
  { name: "branding", label: "Branding" },
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
