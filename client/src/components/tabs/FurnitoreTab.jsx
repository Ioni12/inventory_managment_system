import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import ProductImportExport from "./products/ProductImportExport";
import Modal from "../Modal";
import {
  cardClasses,
  errorTextClasses,
  buttonPrimaryClasses,
} from "../../lib/ui";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Field config for the existing generic Modal.jsx (same shape CatalogTab
// used for its Supplier CRUD form — moved here verbatim since Suppliers
// no longer live in CatalogTab).
const SUPPLIER_FIELDS = [
  { name: "name", label: "Name", required: true },
  { name: "contactPerson", label: "Contact person" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "email" },
  { name: "notes", label: "Notes", type: "textarea" },
];

/**
 * Standalone admin-only tab for Suppliers ("Furnitore"), moved out of
 * CatalogTab.jsx (which is now Categories-only). Same CRUD modal as
 * before, plus new export/import wired to /api/suppliers/export and
 * /api/suppliers/import.
 */
export default function FurnitoreTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [modalState, setModalState] = useState(null); // null | { mode: 'create'|'edit', supplier? }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/suppliers");
      setSuppliers(data);
    } catch (err) {
      setError(err.message || "Ngarkimi i furnitorëve dështoi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/suppliers/export`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Eksportimi dështoi");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "furnitore.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Eksportimi dështoi");
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/suppliers/import`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Importi dështoi");
      setImportResult(data);
      await load();
    } catch (err) {
      setError(err.message || "Importi dështoi");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleDelete(supplier) {
    if (!window.confirm(`Fshi furnitorin "${supplier.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${supplier._id}`);
      await load();
    } catch (err) {
      setError(err.message || "Fshirja dështoi");
    }
  }

  async function handleModalSubmit(values) {
    // Let Modal.jsx handle errors itself (it catches, shows err.message
    // inline, and keeps the form open) — only close + refetch on success.
    if (modalState.mode === "create") {
      await api.post("/suppliers", values);
    } else {
      await api.put(`/suppliers/${modalState.supplier._id}`, values);
    }
    setModalState(null);
    await load();
  }

  if (loading) {
    return <p className="text-body text-gray-500">Duke ngarkuar…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-title text-gray-900">Furnitorët</h2>
        <div className="flex items-center gap-3">
          <ProductImportExport
            exporting={exporting}
            importing={importing}
            onExport={handleExport}
            onImportFile={handleImportFile}
            inputId="furnitore-import-input"
          />
          <button
            type="button"
            className={buttonPrimaryClasses}
            onClick={() => setModalState({ mode: "create" })}
          >
            Add supplier
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`${cardClasses} mb-4 p-4`}>
          <p className="text-body text-gray-900 mb-2">
            {importResult.created} krijuar, {importResult.updated} përditësuar
          </p>
          {importResult.skipped?.length > 0 && (
            <div>
              <p className="text-meta font-medium text-gray-500 mb-1">
                Rreshta të anashkaluar ({importResult.skipped.length}):
              </p>
              <ul className="text-meta text-gray-600 list-disc pl-5 space-y-0.5">
                {importResult.skipped.map((s, i) => (
                  <li key={i}>
                    Rreshti {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className={errorTextClasses}>
          {error}
        </p>
      )}

      {suppliers.length === 0 ? (
        <p className="text-body text-gray-500">Nuk ka furnitorë ende.</p>
      ) : (
        <>
          <div
            className={`${cardClasses} hidden md:block p-0 overflow-hidden overflow-x-auto`}
          >
            <table className="w-full text-left">
              <thead className="bg-surface-sunken border-b border-surface-border">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Emer subjekti
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Emer Mbiemer
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Telefon
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Notes
                  </th>
                  <th scope="col" className="px-4 py-2">
                    <span className="sr-only">Veprime</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr
                    key={s._id}
                    className="border-b border-surface-border last:border-0"
                  >
                    <td className="px-4 py-2 text-body text-gray-900">
                      {s.name}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {s.contactPerson || "—"}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {s.phone || "—"}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {s.email || "—"}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {s.notes || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-meta text-accent-600 hover:underline"
                          onClick={() =>
                            setModalState({ mode: "edit", supplier: s })
                          }
                        >
                          Ndrysho
                        </button>
                        <button
                          type="button"
                          className="text-meta text-status-danger hover:underline"
                          onClick={() => handleDelete(s)}
                        >
                          Fshi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex flex-col gap-3">
            {suppliers.map((s) => (
              <div key={s._id} className={`${cardClasses} p-4`}>
                <p className="text-body font-medium text-gray-900 mb-1">
                  {s.name}
                </p>
                <p className="text-body text-gray-600 mb-1">
                  {s.contactPerson || "—"}
                </p>
                <p className="text-body text-gray-600 mb-1">{s.phone || "—"}</p>
                <p className="text-body text-gray-600 mb-1">{s.email || "—"}</p>
                <p className="text-body text-gray-600 mb-3">{s.notes || "—"}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-meta text-accent-600 hover:underline"
                    onClick={() => setModalState({ mode: "edit", supplier: s })}
                  >
                    Ndrysho
                  </button>
                  <button
                    type="button"
                    className="text-meta text-status-danger hover:underline"
                    onClick={() => handleDelete(s)}
                  >
                    Fshi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalState && (
        <Modal
          title={
            modalState.mode === "create" ? "Add supplier" : "Edit supplier"
          }
          fields={SUPPLIER_FIELDS}
          initialValues={modalState.supplier || {}}
          onSubmit={handleModalSubmit}
          onClose={() => setModalState(null)}
          submitLabel={modalState.mode === "create" ? "Add" : "Save"}
        />
      )}
    </div>
  );
}
