import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import Modal from "../Modal";
import {
  buttonPrimaryClasses,
  cardClasses,
  errorTextClasses,
} from "../../lib/ui";

const FIELDS = [
  { name: "firstName", label: "Emri", required: true },
  { name: "lastName", label: "Mbiemri", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  {
    name: "emails",
    label: "Email shtesë",
    type: "list",
    itemType: "email",
    addLabel: "+ Shto email",
  },
  { name: "company", label: "Kompania" },
  { name: "department", label: "Departamenti" },
  { name: "phone", label: "Telefoni" },
  { name: "badgeQr", label: "Badge / QR Code" },
  {
    name: "role",
    label: "Roli",
    type: "select",
    required: true,
    options: [
      { value: "admin", label: "Admin" },
      { value: "user", label: "Përdorues" },
    ],
  },
];

export default function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMode, setModalMode] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEmployees(await api.get("/employees"));
    } catch (err) {
      setError(err.message || "Ngarkimi i punonjësve dështoi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(values) {
    await api.post("/employees", values);
    setModalMode(null);
    await load();
  }

  async function handleEdit(id, values) {
    await api.put(`/employees/${id}`, values);
    setModalMode(null);
    await load();
  }

  async function handleDelete(id) {
    if (
      !window.confirm("Të fshihet ky punonjës? Ky veprim nuk mund të kthehet.")
    )
      return;
    try {
      await api.delete(`/employees/${id}`);
      await load();
    } catch (err) {
      setError(err.message || "Fshirja e punonjësit dështoi");
    }
  }

  if (loading)
    return <p className="text-body text-gray-500">Duke ngarkuar punonjësit…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title text-gray-900">Punonjësit</h2>
        <button
          className={buttonPrimaryClasses}
          onClick={() => setModalMode("create")}
        >
          Shto punonjës
        </button>
      </div>

      {error && (
        <p role="alert" className={errorTextClasses}>
          {error}
        </p>
      )}

      {employees.length === 0 ? (
        <p className="text-body text-gray-500">Ende nuk ka punonjës.</p>
      ) : (
        <div className={`${cardClasses} p-0 overflow-hidden`}>
          <table className="w-full text-left">
            <thead className="bg-surface-sunken border-b border-surface-border">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-2 text-meta font-medium text-gray-500"
                >
                  Emri
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
                  Kompania
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
                  Roli
                </th>
                <th scope="col" className="px-4 py-2">
                  <span className="sr-only">Veprime</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr
                  key={e._id}
                  className="border-b border-surface-border last:border-0"
                >
                  <td className="px-4 py-2 text-body text-gray-900">
                    {e.firstName} {e.lastName}
                  </td>
                  <td className="px-4 py-2 text-body text-gray-600">
                    {e.email}
                  </td>
                  <td className="px-4 py-2 text-body text-gray-600">
                    {e.company || "—"}
                  </td>
                  <td className="px-4 py-2 text-body text-gray-600">
                    {e.department || "—"}
                  </td>
                  <td className="px-4 py-2 text-body text-gray-600 capitalize">
                    {e.role === "admin" ? "Admin" : "Përdorues"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="text-meta text-accent-600 underline mr-3"
                      onClick={() => setModalMode({ edit: e })}
                    >
                      Ndrysho
                    </button>
                    <button
                      type="button"
                      className="text-meta text-status-danger underline"
                      onClick={() => handleDelete(e._id)}
                    >
                      Fshi
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
          title="Shto punonjës"
          fields={FIELDS}
          initialValues={{}}
          onSubmit={handleCreate}
          onClose={() => setModalMode(null)}
          submitLabel="Shto"
        />
      )}

      {modalMode?.edit && (
        <Modal
          title="Ndrysho punonjësin"
          fields={FIELDS}
          initialValues={modalMode.edit}
          onSubmit={(values) => handleEdit(modalMode.edit._id, values)}
          onClose={() => setModalMode(null)}
          submitLabel="Ruaj"
        />
      )}
    </div>
  );
}
