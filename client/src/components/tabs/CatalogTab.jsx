import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import Modal from "../Modal";
import {
  buttonPrimaryClasses,
  cardClasses,
  errorTextClasses,
} from "../../lib/ui";

const CATEGORY_FIELDS = [
  { name: "name", label: "Name", required: true },
  {
    name: "trackingType",
    label: "Tracking type",
    type: "select",
    required: true,
    options: [
      { value: "serial", label: "Serial" },
      { value: "quantity", label: "Quantity" },
    ],
  },
  { name: "description", label: "Description", type: "textarea" },
];

const SUPPLIER_FIELDS = [
  { name: "name", label: "Name", required: true },
  { name: "contactPerson", label: "Contact person" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email", type: "email" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const ENTITIES = {
  categories: {
    label: "Categories",
    endpoint: "/categories",
    fields: CATEGORY_FIELDS,
    columns: ["name", "trackingType"],
  },
  suppliers: {
    label: "Suppliers",
    endpoint: "/suppliers",
    fields: SUPPLIER_FIELDS,
    columns: ["name", "contactPerson", "email"],
  },
};

function EntitySection({ config }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api.get(config.endpoint));
    } catch (err) {
      setError(err.message || `Failed to load ${config.label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, config.label]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(values) {
    await api.post(config.endpoint, values);
    setModalMode(null);
    await load();
  }

  async function handleEdit(id, values) {
    await api.put(`${config.endpoint}/${id}`, values);
    setModalMode(null);
    await load();
  }

  async function handleDelete(id) {
    if (
      !window.confirm(
        `Delete this ${config.label.toLowerCase().slice(0, -1)}? This cannot be undone.`,
      )
    )
      return;
    try {
      await api.delete(`${config.endpoint}/${id}`);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete");
    }
  }

  if (loading)
    return (
      <p className="text-body text-gray-500">
        Loading {config.label.toLowerCase()}…
      </p>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body font-medium text-gray-900">{config.label}</h3>
        <button
          className={buttonPrimaryClasses}
          onClick={() => setModalMode("create")}
        >
          Add {config.label.slice(0, -1).toLowerCase()}
        </button>
      </div>

      {error && (
        <p role="alert" className={errorTextClasses}>
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-body text-gray-500 mb-8">
          No {config.label.toLowerCase()} yet.
        </p>
      ) : (
        <div className={`${cardClasses} p-0 overflow-hidden mb-8`}>
          <table className="w-full text-left">
            <thead className="bg-surface-sunken border-b border-surface-border">
              <tr>
                {config.columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="px-4 py-2 text-meta font-medium text-gray-500 capitalize"
                  >
                    {col.replace(/([A-Z])/g, " $1")}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-surface-border last:border-0"
                >
                  {config.columns.map((col) => (
                    <td key={col} className="px-4 py-2 text-body text-gray-700">
                      {item[col] ?? "—"}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="text-meta text-accent-600 underline mr-3"
                      onClick={() => setModalMode({ edit: item })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-meta text-status-danger underline"
                      onClick={() => handleDelete(item._id)}
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
          title={`Add ${config.label.slice(0, -1).toLowerCase()}`}
          fields={config.fields}
          initialValues={{}}
          onSubmit={handleCreate}
          onClose={() => setModalMode(null)}
          submitLabel="Add"
        />
      )}

      {modalMode?.edit && (
        <Modal
          title={`Edit ${config.label.slice(0, -1).toLowerCase()}`}
          fields={config.fields}
          initialValues={modalMode.edit}
          onSubmit={(values) => handleEdit(modalMode.edit._id, values)}
          onClose={() => setModalMode(null)}
          submitLabel="Save"
        />
      )}
    </div>
  );
}

export default function CatalogTab() {
  return (
    <div>
      <div className="mb-8"><p className="eyebrow mb-2">Configuration</p><h2 className="text-3xl font-semibold tracking-tight text-[#17202b]">Catalog</h2><p className="mt-2 text-sm leading-6 text-[#7a8795]">Keep the building blocks of your inventory organized.</p></div>
      <EntitySection config={ENTITIES.categories} />
      <EntitySection config={ENTITIES.suppliers} />
    </div>
  );
}
