import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import NePerdorimRowActions from "./NePerdorimRowActions";
import ProductImportExport from "./products/ProductImportExport";
import { cardClasses, errorTextClasses } from "../../lib/ui";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Editable view of who currently holds what. Reassign/return reuse the
 * same group-action endpoints as ProductsTab's GroupActionsBar, called
 * directly using each row's productId/groupId/holderId — no separate
 * lookup into the Products tab needed. Employee contact fields (email,
 * phone, badge/QR) are NOT editable here; those belong to the Employees
 * tab. No optimistic updates — every successful action refetches this
 * tab's full list, since the backend gives no optimistic-update contract.
 */
export default function NePerdorimTab() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [neP, emps] = await Promise.all([
        api.get("/products/ne-perdorim"),
        api.get("/employees"),
      ]);
      setRows(neP);
      setEmployees(emps);
    } catch (err) {
      setError(err.message || "Ngarkimi i të dhënave dështoi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Same fetch-a-blob pattern as ProductsTab's export handler — swap for
  // an api.js helper if one already exists there (e.g. api.downloadFile).
  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/products/ne-perdorim/export`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Eksportimi dështoi");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ne-perdorim.xlsx";
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

  // Same multipart-upload pattern as ProductsTab's import handler — swap
  // for an api.js helper (e.g. api.uploadFile) if one already exists.
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/products/ne-perdorim/import`, {
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

  function actionError(fallback) {
    return (err) => setError(err.message || fallback);
  }

  function actionsFor(row) {
    return {
      onReassign: (body) =>
        api
          .post(`/products/${row.productId}/groups/assign`, body)
          .then(load)
          .catch(actionError("Rialokimi dështoi")),
      onReturn: (body) =>
        api
          .post(`/products/${row.productId}/groups/return`, body)
          .then(load)
          .catch(actionError("Kthimi në magazinë dështoi")),
    };
  }

  if (loading) {
    return <p className="text-body text-gray-500">Duke ngarkuar…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-title text-gray-900">Në Përdorim</h2>
        <ProductImportExport
          exporting={exporting}
          importing={importing}
          onExport={handleExport}
          onImportFile={handleImportFile}
          inputId="ne-perdorim-import-input"
        />
      </div>

      {importResult && (
        <div className={`${cardClasses} mb-4 p-4`}>
          <p className="text-body text-gray-900 mb-1">
            Punonjës: {importResult.employeesCreated} krijuar,{" "}
            {importResult.employeesUpdated} përditësuar
          </p>
          <p className="text-body text-gray-900 mb-2">
            Caktime të reja: {importResult.assignmentsCreated}
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

      {rows.length === 0 ? (
        <p className="text-body text-gray-500">
          Asgjë nuk është aktualisht në përdorim.
        </p>
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
                    Nr.
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
                    Kompani
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Departamenti
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Asset ID
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Sasia
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
                    Nr. Telefoni
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    Badge + QR Code
                  </th>
                  <th scope="col" className="px-4 py-2">
                    <span className="sr-only">Veprime</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.groupId}
                    className="border-b border-surface-border last:border-0"
                  >
                    <td className="px-4 py-2 text-meta text-gray-500">
                      {r.nr}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-900">
                      {r.emerMbiemer}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {r.kompani || "—"}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {r.departamenti || "—"}
                    </td>
                    <td className="px-4 py-2 text-meta text-gray-500">
                      {r.assetId}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-700">
                      {r.sasia}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {r.email || "—"}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {r.nrTelefoni || "—"}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {r.badgeQr || "—"}
                    </td>
                    <td className="px-4 py-2">
                      <NePerdorimRowActions
                        row={r}
                        employees={employees}
                        {...actionsFor(r)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex flex-col gap-3">
            {rows.map((r) => (
              <div key={r.groupId} className={`${cardClasses} p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-body font-medium text-gray-900">
                    {r.emerMbiemer}
                  </span>
                  <span className="text-meta text-gray-500">#{r.nr}</span>
                </div>
                <p className="text-body text-gray-600 mb-1">
                  {r.kompani || "—"} · {r.departamenti || "—"}
                </p>
                <p className="text-meta text-gray-500 mb-1">
                  {r.assetId} · Sasia: {r.sasia}
                </p>
                <p className="text-body text-gray-600 mb-1">{r.email || "—"}</p>
                <p className="text-body text-gray-600 mb-1">
                  {r.nrTelefoni || "—"}
                </p>
                <p className="text-body text-gray-600 mb-3">
                  {r.badgeQr || "—"}
                </p>
                <NePerdorimRowActions
                  row={r}
                  employees={employees}
                  {...actionsFor(r)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
