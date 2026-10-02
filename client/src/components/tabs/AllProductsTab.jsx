import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  cardClasses,
  errorTextClasses,
  statusBadgeClasses,
} from "../../lib/ui";

const STATUS_ORDER = [
  "Ne magazine",
  "Ne perdorim",
  "Ne riparim",
  "Jashte perdorimit",
];

const STATUS_LABELS = {
  "Ne magazine": "Në magazinë",
  "Ne perdorim": "Në përdorim",
  "Ne riparim": "Në riparim",
  "Jashte perdorimit": "Jashtë përdorimit",
};

const STATUS_BADGE_COLORS = {
  "Ne magazine": "bg-gray-100 text-gray-700",
  "Ne perdorim": "bg-status-success/10 text-status-success",
  "Ne riparim": "bg-status-warning/10 text-status-warning",
  "Jashte perdorimit": "bg-status-danger/10 text-status-danger",
};

function StatusBadgeCell({ status }) {
  return (
    <span
      className={`${statusBadgeClasses} ${
        STATUS_BADGE_COLORS[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// Product-level fields the sheet has that I couldn't confirm names for.
// If a column shows "—" everywhere, fix the field name here.
const getUnit = (p) => p.unit;
const getPrice = (p) => p.purchasePrice;
const getDescription = (p) => p.description;

// Same columns as the "Asete gjendje" sheet, in the same order.
const COLUMNS = [
  "Asset ID",
  "Category",
  "Serial Number",
  "Model",
  "Branding",
  "Stock",
  "Unit",
  "Suplier",
  "Purchase Price",
  "Status",
  "Description",
];

// One row per serial, plus one per group for the unserialized remainder.
// Every status is included.
function buildRows(product) {
  const groups = [...(product.groups ?? [])].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
  const rows = [];
  for (const g of groups) {
    const serials = g.serials ?? [];
    serials.forEach((s) =>
      rows.push({ key: `${g._id}-${s}`, serial: s, qty: 1, status: g.status }),
    );
    const anon = g.quantity - serials.length;
    if (anon > 0) {
      rows.push({
        key: `${g._id}-anon`,
        serial: null,
        qty: anon,
        status: g.status,
      });
    }
  }
  return rows;
}

const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

export default function AllProductsTab({ searchQuery = "" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prods = await api.get("/products");
        if (!cancelled) setProducts(prods);
      } catch (err) {
        if (!cancelled)
          setError(err.message || "Ngarkimi i produkteve dështoi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (!query) return true;
    const serials = (p.groups ?? []).flatMap((g) => g.serials ?? []);
    return [p.assetId, p.name, p.branding, ...serials]
      .filter(Boolean)
      .some((f) => f.toLowerCase().includes(query));
  });

  if (loading) {
    return <p className="text-body text-gray-500">Duke ngarkuar produktet…</p>;
  }

  return (
    <div>
      <h2 className="text-title text-gray-900 mb-4">All Products</h2>

      {error && (
        <p role="alert" className={errorTextClasses}>
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-body text-gray-500">Asnjë produkt.</p>
      ) : (
        <div className={`${cardClasses} p-0 overflow-x-auto`}>
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-surface-sunken border-b border-surface-border">
              <tr>
                {COLUMNS.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap((p) => {
                const rows = buildRows(p);
                // Product with no units yet: still show it, with blank
                // serial/status.
                const list = rows.length
                  ? rows
                  : [
                      {
                        key: `${p._id}-empty`,
                        serial: null,
                        qty: 0,
                        status: null,
                      },
                    ];
                return list.map((r) => (
                  <tr
                    key={`${p._id}-${r.key}`}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-sunken"
                  >
                    <td className="px-4 py-2 text-meta text-gray-500">
                      {p.assetId}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {dash(p.category?.name)}
                    </td>
                    <td className="px-4 py-2 text-body font-mono text-gray-700">
                      {dash(r.serial)}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {dash(p.branding)}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-700">
                      {r.qty}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {dash(getUnit(p))}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {dash(p.supplier?.name)}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {dash(getPrice(p))}
                    </td>
                    <td className="px-4 py-2">
                      {r.status ? <StatusBadgeCell status={r.status} /> : "—"}
                    </td>
                    <td className="px-4 py-2 text-body text-gray-600">
                      {dash(getDescription(p))}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
