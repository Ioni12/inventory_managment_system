import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import Modal from "../Modal";
import { buttonPrimaryClasses, errorTextClasses } from "../../lib/ui";
import AssetTable from "./assets/AssetTable";
import AssetCardList from "./assets/AssetCardList";
import AssetDetailModal from "./assets/AssetDetailModal";
import { buildAssetFields, CREATE_DEFAULTS } from "./assets/assetFields";

export default function AssetsTab({ searchQuery = "" }) {
  const [assets, setAssets] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null); // null | 'create' | { edit: asset }
  const [detailAsset, setDetailAsset] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, p, e, l] = await Promise.all([
        api.get("/asset-units"),
        api.get("/products"),
        api.get("/employees"),
        api.get("/locations"),
      ]);
      setAssets(a);
      setProducts(p);
      setEmployees(e);
      setLocations(l);
    } catch (err) {
      setError(err.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const fields = buildAssetFields({ products, employees, locations });

  async function handleCreate(values) {
    await api.post("/asset-units", values);
    setModalMode(null);
    await loadAll();
  }

  async function handleEdit(id, values) {
    await api.put(`/asset-units/${id}`, values);
    setModalMode(null);
    setDetailAsset(null);
    await loadAll();
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this asset? This cannot be undone.")) return;
    try {
      await api.delete(`/asset-units/${id}`);
      setDetailAsset(null);
      await loadAll();
    } catch (err) {
      setError(err.message || "Failed to delete asset");
    }
  }

  // Rule #4: one-click status change without opening the full edit form.
  async function handleQuickStatus(asset, newStatus) {
    try {
      await api.put(`/asset-units/${asset._id}`, { status: newStatus });
      await loadAll();
      setDetailAsset((prev) =>
        prev && prev._id === asset._id ? { ...prev, status: newStatus } : prev,
      );
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
  }

  // Rule #8: typo-tolerant global search — client-side, every keystroke,
  // across asset code, serial, product name, and holder name.
  const query = searchQuery.trim().toLowerCase();
  const filteredAssets = query
    ? assets.filter((a) =>
        [a.assetCode, a.serial, a.productName, a.holderName]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query)),
      )
    : assets;

  if (loading)
    return <p className="text-body text-gray-500">Loading assets…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow mb-2">Overview</p><h2 className="text-3xl font-semibold tracking-tight text-[#17202b]">Assets</h2><p className="mt-2 text-sm leading-6 text-[#7a8795]">Track every device, owner, and location at a glance.</p></div>
        <button
          className={buttonPrimaryClasses}
          onClick={() => setModalMode("create")}
        >
          Add asset
        </button>
      </div>

      {error && (
        <p role="alert" className={errorTextClasses}>
          {error}
        </p>
      )}

      {assets.length === 0 ? (
        <p className="text-body text-gray-500">No assets yet.</p>
      ) : filteredAssets.length === 0 ? (
        <p className="text-body text-gray-500">
          No assets match "{searchQuery}".
        </p>
      ) : (
        <>
          <AssetTable
            assets={filteredAssets}
            onView={setDetailAsset}
            onQuickStatus={handleQuickStatus}
          />
          <AssetCardList
            assets={filteredAssets}
            onView={setDetailAsset}
            onQuickStatus={handleQuickStatus}
          />
        </>
      )}

      {modalMode === "create" && (
        <Modal
          title="Add asset"
          fields={fields}
          initialValues={CREATE_DEFAULTS}
          onSubmit={handleCreate}
          onClose={() => setModalMode(null)}
          submitLabel="Add"
        />
      )}

      {modalMode?.edit && (
        <Modal
          title="Edit asset"
          fields={fields}
          initialValues={{
            ...modalMode.edit,
            product: modalMode.edit.product?._id ?? modalMode.edit.product,
            holder: modalMode.edit.holder?._id ?? modalMode.edit.holder,
            location: modalMode.edit.location?._id ?? modalMode.edit.location,
            purchaseDate: modalMode.edit.purchaseDate?.slice(0, 10),
            warrantyUntil: modalMode.edit.warrantyUntil?.slice(0, 10),
          }}
          onSubmit={(values) => handleEdit(modalMode.edit._id, values)}
          onClose={() => setModalMode(null)}
          submitLabel="Save"
        />
      )}

      {detailAsset && (
        <AssetDetailModal
          asset={detailAsset}
          onClose={() => setDetailAsset(null)}
          onEdit={(a) => setModalMode({ edit: a })}
          onDelete={handleDelete}
          onQuickStatus={handleQuickStatus}
        />
      )}
    </div>
  );
}
