import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import Modal from "../Modal";
import ImportResultPanel from "./ImportResultPanel";
import ProductTable from "./products/ProductTable";
import ProductImportExport from "./products/ProductImportExport";
import {
  buildProductFields,
  PRODUCT_CREATE_DEFAULTS,
} from "./products/productFields";
import { buttonPrimaryClasses, errorTextClasses } from "../../lib/ui";

export default function ProductsTab({ searchQuery = "" }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null); // null | 'create' | { edit: product }
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prods, cats, sups, emps] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/suppliers"),
        api.get("/employees"),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSuppliers(sups);
      setEmployees(emps);
    } catch (err) {
      setError(err.message || "Ngarkimi i produkteve dështoi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const fields = buildProductFields({ categories, suppliers });

  async function handleCreate(values) {
    await api.post("/products", values);
    setModalMode(null);
    await loadAll();
  }

  async function handleEdit(id, values) {
    const { assetId, ...payload } = values;
    await api.put(`/products/${id}`, payload);
    setModalMode(null);
    await loadAll();
  }

  async function handleDelete(id) {
    if (
      !window.confirm("Të fshihet ky produkt? Ky veprim nuk mund të kthehet.")
    )
      return;
    try {
      await api.delete(`/products/${id}`);
      await loadAll();
    } catch (err) {
      setError(err.message || "Fshirja e produktit dështoi");
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
      if (!res.ok) throw new Error(`Eksportimi dështoi (${res.status})`);
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
      setError(err.message || "Eksportimi i produkteve dështoi");
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
      setError(err.message || "Importimi i produkteve dështoi");
    } finally {
      setImporting(false);
    }
  }

  // --- Group actions: each is a distinct backend operation, not a
  // generic "edit group" call. All require productId in the URL; body
  // shapes match the 5 endpoints exactly. Errors surface inline rather
  // than silently failing, since e.g. "moved more units than available"
  // is a real, expected failure mode the user needs to see.
  function groupActionError(fallback) {
    return (err) => setError(err.message || fallback);
  }

  function groupActionsFor(productId) {
    return {
      onAssign: (body) =>
        api
          .post(`/products/${productId}/groups/assign`, body)
          .then(loadAll)
          .catch(groupActionError("Caktimi dështoi")),
      onReturn: (body) =>
        api
          .post(`/products/${productId}/groups/return`, body)
          .then(loadAll)
          .catch(groupActionError("Kthimi në magazinë dështoi")),
      onRepair: (body) =>
        api
          .post(`/products/${productId}/groups/repair`, body)
          .then(loadAll)
          .catch(groupActionError("Dërgimi në riparim dështoi")),
      onReturnFromRepair: (body) =>
        api
          .post(`/products/${productId}/groups/return-from-repair`, body)
          .then(loadAll)
          .catch(groupActionError("Kthimi nga riparimi dështoi")),
      onDecommission: (body) =>
        api
          .post(`/products/${productId}/groups/decommission`, body)
          .then(loadAll)
          .catch(groupActionError("Nxjerrja jashtë përdorimit dështoi")),
      onDeleteGroup: (groupId) =>
        api
          .delete(`/products/${productId}/groups/${groupId}`)
          .then(loadAll)
          .catch(groupActionError("Fshirja e grupit dështoi")),
    };
  }

  // Rule #8: typo-tolerant global search — client-side, every keystroke,
  // across Asset ID, product name, and branding.
  const query = searchQuery.trim().toLowerCase();
  const filteredProducts = query
    ? products.filter((p) =>
        [p.assetId, p.name, p.branding]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query)),
      )
    : products;

  if (loading) {
    return <p className="text-body text-gray-500">Duke ngarkuar produktet…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-title text-gray-900">Produktet</h2>

        <div className="flex flex-wrap items-center gap-3">
          <ProductImportExport
            exporting={exporting}
            importing={importing}
            onExport={handleExport}
            onImportFile={handleImportFile}
          />
          <button
            className={buttonPrimaryClasses}
            onClick={() => setModalMode("create")}
          >
            Shto produkt
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
        <p className="text-body text-gray-500">Ende nuk ka produkte.</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-body text-gray-500">
          Asnjë produkt nuk përputhet me "{searchQuery}".
        </p>
      ) : (
        <ProductTable
          products={filteredProducts}
          employees={employees}
          onEdit={(p) => setModalMode({ edit: p })}
          onDelete={handleDelete}
          groupActionsFor={groupActionsFor}
        />
      )}

      {modalMode === "create" && (
        <Modal
          title="Shto produkt"
          fields={fields}
          initialValues={PRODUCT_CREATE_DEFAULTS}
          onSubmit={handleCreate}
          onClose={() => setModalMode(null)}
          submitLabel="Shto"
        />
      )}

      {modalMode?.edit && (
        <Modal
          title={`Ndrysho produktin · ${modalMode.edit.assetId}`}
          fields={fields}
          initialValues={{
            ...modalMode.edit,
            category: modalMode.edit.category?._id,
            supplier: modalMode.edit.supplier?._id,
          }}
          onSubmit={(values) => handleEdit(modalMode.edit._id, values)}
          onClose={() => setModalMode(null)}
          submitLabel="Ruaj"
        />
      )}
    </div>
  );
}
