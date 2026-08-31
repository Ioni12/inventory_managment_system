import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { cardClasses, errorTextClasses, inputClasses } from "../../lib/ui";

const ENTITY_TYPES = ["Product", "Employee", "Supplier", "Category", "Group"];
const ACTIONS = [
  "create",
  "update",
  "delete",
  "assign",
  "return",
  "repair",
  "return-from-repair",
  "decommission",
  "delete-group",
  "import-summary",
];

// Albanian labels for action + entityType, used in the "What" column.
const ACTION_LABELS = {
  create: "krijoi",
  update: "përditësoi",
  delete: "fshiu",
  assign: "caktoi",
  return: "ktheu në magazinë",
  repair: "dërgoi në riparim",
  "return-from-repair": "ktheu nga riparimi",
  decommission: "nxori jashtë përdorimit",
  "delete-group": "fshiu grupin",
  "import-summary": "importoi",
};

const ENTITY_LABELS = {
  Product: "Produkt",
  Employee: "Punonjës",
  Supplier: "Furnitor",
  Category: "Kategori",
  Group: "Grup",
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Renders the `changes` object for a single log line. Special-cases
// import-summary (mini created/updated/skipped block, same visual
// language as the app's ImportResultPanel, kept inline here rather than
// imported since that component's real props aren't available in this
// context) and falls back to a plain key/value list for everything else.
function ChangesView({ action, changes }) {
  if (!changes || typeof changes !== "object") return <span>—</span>;

  if (action === "import-summary") {
    const created = changes.created ?? changes.employeesCreated;
    const updated = changes.updated ?? changes.employeesUpdated;
    const assignments = changes.assignmentsCreated;
    const skipped = changes.skipped || [];
    return (
      <div>
        <p className="text-body text-gray-900">
          {changes.filename && (
            <span className="text-muted">{changes.filename} — </span>
          )}
          {created} krijuar, {updated} përditësuar
          {assignments != null && <>, {assignments} caktime të reja</>}
        </p>
        {skipped.length > 0 && (
          <details className="mt-1">
            <summary className="text-meta text-muted cursor-pointer">
              {skipped.length} rreshta të anashkaluar
            </summary>
            <ul className="text-meta text-muted list-disc pl-5 mt-1 space-y-0.5">
              {skipped.map((s, i) => (
                <li key={i}>
                  Rreshti {s.row}: {s.reason}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  // update: { field: { from, to } }
  const isFieldDiff = Object.values(changes).every(
    (v) => v && typeof v === "object" && "from" in v && "to" in v,
  );
  if (isFieldDiff && Object.keys(changes).length > 0) {
    return (
      <ul className="text-meta text-gray-700 space-y-0.5">
        {Object.entries(changes).map(([field, { from, to }]) => (
          <li key={field}>
            <span className="text-muted">{field}:</span> {String(from ?? "—")} →{" "}
            {String(to ?? "—")}
          </li>
        ))}
      </ul>
    );
  }

  // Generic fallback: flat key/value list (create snapshots, group
  // action detail, delete/delete-group snapshots).
  return (
    <ul className="text-meta text-gray-700 space-y-0.5">
      {Object.entries(changes).map(([key, value]) => (
        <li key={key}>
          <span className="text-muted">{key}:</span>{" "}
          {typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : String(value ?? "—")}
        </li>
      ))}
    </ul>
  );
}

function LogRow({ log }) {
  return (
    <tr className="border-b border-surface-border last:border-0 align-top">
      <td className="px-4 py-2 text-meta text-muted whitespace-nowrap">
        {formatDate(log.createdAt)}
      </td>
      <td className="px-4 py-2 text-body text-gray-900 whitespace-nowrap">
        {log.performedByName || "—"}
      </td>
      <td className="px-4 py-2 text-body text-gray-700 whitespace-nowrap">
        {ACTION_LABELS[log.action] || log.action}{" "}
        {ENTITY_LABELS[log.entityType] || log.entityType}
      </td>
      <td className="px-4 py-2 text-body text-gray-900">{log.entityLabel}</td>
      <td className="px-4 py-2">
        <ChangesView action={log.action} changes={log.changes} />
      </td>
    </tr>
  );
}

/**
 * Rows sharing a batchId (one import run) are grouped: the
 * import-summary line renders as a collapsible section header, with its
 * per-row lines nested underneath — instead of one long flat list mixing
 * single-item imports in with regular interactive actions.
 */
function groupByBatch(logs) {
  const batches = new Map(); // batchId -> { summary, items: [] }
  const standalone = [];

  for (const log of logs) {
    if (!log.batchId) {
      standalone.push(log);
      continue;
    }
    if (!batches.has(log.batchId)) {
      batches.set(log.batchId, { summary: null, items: [] });
    }
    const batch = batches.get(log.batchId);
    if (log.action === "import-summary") {
      batch.summary = log;
    } else {
      batch.items.push(log);
    }
  }

  return { batches, standalone };
}

function BatchGroup({ batchId, batch }) {
  const [open, setOpen] = useState(false);
  const { summary, items } = batch;

  return (
    <>
      <tr className="border-b border-surface-border bg-surface-sunken">
        <td className="px-4 py-2 text-meta text-muted whitespace-nowrap">
          {summary ? formatDate(summary.createdAt) : "—"}
        </td>
        <td className="px-4 py-2 text-body text-gray-900 whitespace-nowrap">
          {summary?.performedByName || "—"}
        </td>
        <td className="px-4 py-2 text-body text-gray-700 whitespace-nowrap">
          Import — {items.length} rreshta
        </td>
        <td className="px-4 py-2 text-body text-gray-900">
          {summary?.entityLabel || "—"}
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-3">
            {summary && (
              <ChangesView action="import-summary" changes={summary.changes} />
            )}
            {items.length > 0 && (
              <button
                type="button"
                className="text-meta text-accent-text hover:underline whitespace-nowrap"
                onClick={() => setOpen((o) => !o)}
              >
                {open ? "Fsheh rreshtat" : `Shiko ${items.length} rreshta`}
              </button>
            )}
          </div>
        </td>
      </tr>
      {open &&
        items.map((log) => (
          <tr
            key={log._id}
            className="border-b border-surface-border last:border-0 align-top"
          >
            <td className="px-4 py-2 pl-8 text-meta text-muted whitespace-nowrap">
              {formatDate(log.createdAt)}
            </td>
            <td className="px-4 py-2 text-meta text-muted" colSpan={1}>
              —
            </td>
            <td className="px-4 py-2 text-meta text-muted whitespace-nowrap">
              {ACTION_LABELS[log.action] || log.action}{" "}
              {ENTITY_LABELS[log.entityType] || log.entityType}
            </td>
            <td className="px-4 py-2 text-body text-gray-700">
              {log.entityLabel}
            </td>
            <td className="px-4 py-2">
              <ChangesView action={log.action} changes={log.changes} />
            </td>
          </tr>
        ))}
    </>
  );
}

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      const data = await api.get(`/logs?${params.toString()}`);
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err.message || "Ngarkimi i regjistrave dështoi");
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 whenever a filter changes.
  function handleEntityTypeChange(value) {
    setEntityType(value);
    setPage(1);
  }
  function handleActionChange(value) {
    setAction(value);
    setPage(1);
  }

  const { batches, standalone } = groupByBatch(logs);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-title text-gray-900">Regjistri i veprimeve</h2>
        <div className="flex items-center gap-3">
          <select
            className={inputClasses}
            value={entityType}
            onChange={(e) => handleEntityTypeChange(e.target.value)}
          >
            <option value="">Të gjitha entitetet</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTITY_LABELS[t] || t}
              </option>
            ))}
          </select>
          <select
            className={inputClasses}
            value={action}
            onChange={(e) => handleActionChange(e.target.value)}
          >
            <option value="">Të gjitha veprimet</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className={errorTextClasses}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-body text-muted">Duke ngarkuar…</p>
      ) : logs.length === 0 ? (
        <p className="text-body text-muted">
          Nuk ka regjistra për t'u shfaqur.
        </p>
      ) : (
        <>
          <div className={`${cardClasses} p-0 overflow-hidden overflow-x-auto`}>
            <table className="w-full text-left">
              <thead className="bg-surface-sunken border-b border-surface-border">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-muted"
                  >
                    Kur
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-muted"
                  >
                    Kush
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-muted"
                  >
                    Çfarë
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-muted"
                  >
                    Entiteti
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-muted"
                  >
                    Ndryshimet
                  </th>
                </tr>
              </thead>
              <tbody>
                {standalone.map((log) => (
                  <LogRow key={log._id} log={log} />
                ))}
                {[...batches.entries()].map(([batchId, batch]) => (
                  <BatchGroup key={batchId} batchId={batchId} batch={batch} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-meta text-muted">
              Faqja {page} nga {totalPages} ({total} regjistra gjithsej)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-meta text-accent-text hover:underline disabled:text-muted disabled:no-underline disabled:cursor-not-allowed"
              >
                Mbrapa
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-meta text-accent-text hover:underline disabled:text-muted disabled:no-underline disabled:cursor-not-allowed"
              >
                Përpara
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
