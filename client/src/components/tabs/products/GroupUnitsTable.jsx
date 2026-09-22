import { useState } from "react";
import { UserPlus, Undo2, Wrench, Trash2, Tag } from "lucide-react";
import { api } from "../../../lib/api";
import GroupActionsBar from "../../GroupActionsBar";
import SerialActionsBar from "../../SerialActionsBar";
import {
  inputClasses,
  buttonSecondaryClasses,
  errorTextClasses,
  statusBadgeClasses,
} from "../../../lib/ui";

// Fixed display order so rows don't jump around as data changes.
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
  const colorClasses =
    STATUS_BADGE_COLORS[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`${statusBadgeClasses} ${colorClasses}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/**
 * One row per unit — a serialized unit or a group's anonymous remainder —
 * flattened across every group in the product, sorted by status. Replaces
 * the old StatusSection (grouped headers) + GroupRow (nested cards).
 *
 * Status lives in its own column per-row now, not a shared section
 * header, since groups are no longer bucketed visually. Holder is always
 * in the same column position whether the row has a serial or not.
 */
export default function GroupUnitsTable({
  productId,
  groups,
  employees,
  actions,
  onSerialsChanged,
}) {
  const sortedGroups = [...groups].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );

  return (
    <div className="bg-surface-sunken/60 border-y-2 border-accent-100 pl-3">
      <div className="bg-surface rounded-app border border-surface-border overflow-hidden my-2 mr-3">
        <table className="w-full text-left table-fixed">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
            <col className="w-[36%]" />
          </colgroup>
          <thead className="bg-surface-sunken border-b border-surface-border">
            <tr>
              <th
                scope="col"
                className="px-4 py-2 text-meta font-medium text-gray-500"
              >
                Njësia
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-meta font-medium text-gray-500"
              >
                Statusi
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-meta font-medium text-gray-500"
              >
                Mbajtësi
              </th>
              <th
                scope="col"
                className="px-4 py-2 text-right text-meta font-medium text-gray-500"
              >
                Veprime
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.map((group) => (
              <GroupRows
                key={group._id}
                productId={productId}
                group={group}
                employees={employees}
                actions={actions}
                onSerialsChanged={onSerialsChanged}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Renders one group's rows: one <tr> per serial, plus one <tr> for the
// anonymous remainder (if any). Kept as a sub-component so each group can
// hold its own "add serial" mini-form state independently.
function GroupRows({ productId, group, employees, actions, onSerialsChanged }) {
  const [newSerial, setNewSerial] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [addingSerialOpen, setAddingSerialOpen] = useState(false);

  const serials = group.serials ?? [];
  const anonymousCount = group.quantity - serials.length;
  const holderLabel = group.currentHolder
    ? `${group.currentHolder.firstName} ${group.currentHolder.lastName}`
    : null;

  async function handleAddSerial(e) {
    e.preventDefault();
    if (!newSerial.trim()) return;
    setAddError("");
    setAdding(true);
    try {
      await api.post(`/products/${productId}/groups/${group._id}/serials`, {
        serial: newSerial.trim(),
      });
      setNewSerial("");
      setAddingSerialOpen(false);
      await onSerialsChanged();
    } catch (err) {
      setAddError(err.message || "Shtimi i serialit dështoi");
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      {serials.map((serial) => (
        <tr
          key={serial}
          className="border-b border-surface-border last:border-0"
        >
          <td className="px-4 py-2 text-body font-mono text-gray-700">
            {serial}
          </td>
          <td className="px-4 py-2">
            <StatusBadgeCell status={group.status} />
          </td>
          <td className="px-4 py-2 text-body text-gray-600">
            {holderLabel ?? "—"}
          </td>
          <td className="px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-1 flex-wrap">
              <SerialActionsBar
                serial={serial}
                group={group}
                employees={employees}
                {...actions}
              />
            </div>
          </td>
        </tr>
      ))}

      {anonymousCount > 0 && (
        <tr className="border-b border-surface-border last:border-0">
          <td className="px-4 py-2 text-body text-gray-600">
            {anonymousCount} njësi pa serial
          </td>
          <td className="px-4 py-2">
            <StatusBadgeCell status={group.status} />
          </td>
          <td className="px-4 py-2 text-body text-gray-600">
            {holderLabel ?? "—"}
          </td>
          <td className="px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-1 flex-wrap">
              <GroupActionsBar
                group={group}
                employees={employees}
                {...actions}
              />
              <span className="w-px h-4 bg-surface-border mx-1" />
              {!addingSerialOpen ? (
                <button
                  type="button"
                  title="Shto serial"
                  aria-label="Shto serial"
                  className="inline-flex items-center gap-1 rounded-app px-2 py-1 text-meta text-gray-400 hover:bg-surface-sunken hover:text-gray-600 transition-colors"
                  onClick={() => setAddingSerialOpen(true)}
                >
                  <Tag size={15} aria-hidden="true" />
                  Serial
                </button>
              ) : (
                <form
                  onSubmit={handleAddSerial}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    placeholder="Serial i ri…"
                    aria-label="Serial i ri"
                    className={`${inputClasses} w-32 py-1`}
                  />
                  <button
                    type="submit"
                    disabled={adding || !newSerial.trim()}
                    className={`${buttonSecondaryClasses} text-meta py-1 shrink-0`}
                  >
                    {adding ? "…" : "+ Shto"}
                  </button>
                  <button
                    type="button"
                    className="text-meta text-gray-500 underline shrink-0"
                    onClick={() => {
                      setAddingSerialOpen(false);
                      setNewSerial("");
                      setAddError("");
                    }}
                  >
                    Anulo
                  </button>
                </form>
              )}
            </div>
            {addError && (
              <p className={`${errorTextClasses} text-right`}>{addError}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
