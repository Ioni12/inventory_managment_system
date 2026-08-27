import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../lib/api";
import Modal from "../Modal";
import ImportResultPanel from "./ImportResultPanel";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  cardClasses,
  errorTextClasses,
} from "../../lib/ui";

const FIELDS = [
  { name: "name", label: "Name", required: true },
  { name: "type", label: "Type", required: true },
  { name: "sku", label: "SKU", required: true },
  {
    name: "category",
    label: "Category",
    type: "select",
    required: true,
    options: [],
  }, // populated at render
  {
    name: "supplier",
    label: "Supplier",
    type: "select",
    required: true,
    options: [],
  }, // populated at render
  { name: "unit", label: "Unit", required: true },
  { name: "purchasePrice", label: "Purchase price", type: "number" },
  { name: "salePrice", label: "Sale price", type: "number" },
  { name: "minStock", label: "Minimum stock", type: "number" },
  { name: "stock", label: "Stock", type: "number" },
  { name: "branding", label: "Branding" },
  { name: "description", label: "Description", type: "textarea" },
];

export default function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null); // null | 'create' | { edit: product }
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prods, cats, sups] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/suppliers"),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSuppliers(sups);
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const fieldsWithOptions = FIELDS.map((f) => {
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

  async function handleCreate(values) {
    await api.post("/products", values);
    setModalMode(null);
    await loadAll();
  }

  async function handleEdit(id, values) {
    await api.put(`/products/${id}`, values);
    setModalMode(null);
    await loadAll();
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    try {
      await api.delete(`/products/${id}`);
      await loadAll();
    } catch (err) {
      setError(err.message || "Failed to delete product");
    }
  }

  // Fetched as a blob (not a plain <a href>) so the session cookie is
  // guaranteed to be sent via credentials:'include', same as every other
  // authenticated request in this app.
  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(api.fileUrl("/products/export"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to export products");
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const result = await api.uploadFile("/products/import", file);
      setImportResult(result);
      await loadAll();
    } catch (err) {
      setError(err.message || "Failed to import products");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return <p className="text-body text-gray-500">Loading products…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-title text-gray-900">Products</h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={buttonSecondaryClasses}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export to Excel"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleImportFile}
            className="peer sr-only"
            id="products-import-input"
          />
          <label
            htmlFor="products-import-input"
            className={`${buttonSecondaryClasses} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-800 ${
              importing ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {importing ? "Importing…" : "Import from Excel"}
          </label>

          <button
            className={buttonPrimaryClasses}
            onClick={() => setModalMode("create")}
          >
            Add product
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className={errorTextClasses}>
          {error}
        </p>
      )}

      {importResult && (
        <ImportResultPanel
          result={importResult}
          onDismiss={() => setImportResult(null)}
        />
      )}

      {products.length === 0 ? (
        <p className="text-body text-gray-500">No products yet.</p>
      ) : (
        <div className={`${cardClasses} p-0 overflow-hidden`}>
          <table className="w-full text-left">
            <thead className="bg-surface-sunken border-b border-surface-border">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-2 text-meta font-medium text-gray-500"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-meta font-medium text-gray-500"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-meta font-medium text-gray-500"
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-meta font-medium text-gray-500"
                >
                  Supplier
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-meta font-medium text-gray-500"
                >
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-surface-border last:border-0"
                >
                  <td className="px-4 py-2 text-body text-gray-900">
                    {p.name}
                  </td>
                  <td className="px-4 py-2 text-body text-gray-600">{p.sku}</td>
                  <td className="px-4 py-2 text-body text-gray-600">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-body text-gray-600">
                    {p.supplier?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="text-meta text-accent-600 underline mr-3"
                      onClick={() => setModalMode({ edit: p })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-meta text-status-danger underline"
                      onClick={() => handleDelete(p._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalMode === "create" && (
        <Modal
          title="Add product"
          fields={fieldsWithOptions}
          initialValues={{}}
          onSubmit={handleCreate}
          onClose={() => setModalMode(null)}
          submitLabel="Add"
        />
      )}

      {modalMode?.edit && (
        <Modal
          title="Edit product"
          fields={fieldsWithOptions}
          initialValues={{
            ...modalMode.edit,
            category: modalMode.edit.category?._id,
            supplier: modalMode.edit.supplier?._id,
          }}
          onSubmit={(values) => handleEdit(modalMode.edit._id, values)}
          onClose={() => setModalMode(null)}
          submitLabel="Save"
        />
      )}
    </div>
  );
}
