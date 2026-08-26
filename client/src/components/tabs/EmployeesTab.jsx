import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import Modal from "../Modal";
import {
  buttonPrimaryClasses,
  cardClasses,
  errorTextClasses,
} from "../../lib/ui";

const FIELDS = [
  { name: "firstName", label: "First name", required: true },
  { name: "lastName", label: "Last name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  {
    name: "role",
    label: "Role",
    type: "select",
    required: true,
    options: [
      { value: "admin", label: "Admin" },
      { value: "user", label: "User" },
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
      setError(err.message || "Failed to load employees");
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
    if (!window.confirm("Delete this employee? This cannot be undone.")) return;
    try {
      await api.delete(`/employees/${id}`);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete employee");
    }
  }

  if (loading)
    return <p className="text-body text-gray-500">Loading employees…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title text-gray-900">Employees</h2>
        <button
          className={buttonPrimaryClasses}
          onClick={() => setModalMode("create")}
        >
          Add employee
        </button>
      </div>

      {error && (
        <p role="alert" className={errorTextClasses}>
          {error}
        </p>
      )}

      {employees.length === 0 ? (
        <p className="text-body text-gray-500">No employees yet.</p>
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
                  Email
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-meta font-medium text-gray-500"
                >
                  Role
                </th>
                <th scope="col" className="px-4 py-2">
                  <span className="sr-only">Actions</span>
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
                  <td className="px-4 py-2 text-body text-gray-600 capitalize">
                    {e.role}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="text-meta text-accent-600 underline mr-3"
                      onClick={() => setModalMode({ edit: e })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-meta text-status-danger underline"
                      onClick={() => handleDelete(e._id)}
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
          title="Add employee"
          fields={FIELDS}
          initialValues={{}}
          onSubmit={handleCreate}
          onClose={() => setModalMode(null)}
          submitLabel="Add"
        />
      )}

      {modalMode?.edit && (
        <Modal
          title="Edit employee"
          fields={FIELDS}
          initialValues={modalMode.edit}
          onSubmit={(values) => handleEdit(modalMode.edit._id, values)}
          onClose={() => setModalMode(null)}
          submitLabel="Save"
        />
      )}
    </div>
  );
}
