import { useState } from "react";
import { api } from "../../../lib/api";
import GroupActionsBar from "../../GroupActionsBar";
import SerialActionsBar from "../../SerialActionsBar";
import {
  inputClasses,
  buttonSecondaryClasses,
  errorTextClasses,
} from "../../../lib/ui";

/**
 * One group's rows: one per tagged serial, plus one for the anonymous
 * remainder. Status is NOT shown here — it's owned by StatusSection's
 * header, since multiple groups sharing a status render flat under one
 * shared header. Holder IS shown here, per-row, as a plain label (not a
 * section) since multiple holders can share a status and are not
 * visually split into sub-blocks — see StatusSection.
 */
export default function GroupRow({
  productId,
  group,
  employees,
  actions,
  onSerialsChanged,
}) {
  const [newSerial, setNewSerial] = useState("");
  const [addError, setAddError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingSerial, setRemovingSerial] = useState(null);
  const [addingSerialOpen, setAddingSerialOpen] = useState(false);

  const serials = group.serials ?? [];
  const hasSerials = serials.length > 0;
  const anonymousCount = group.quantity - serials.length;
  const holderLabel = group.currentHolder
    ? `${group.currentHolder.firstName} ${group.currentHolder.lastName}`
    : "Pa caktuar";

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

  async function handleRemoveSerial(serial) {
    setRemoveError("");
    setRemovingSerial(serial);
    try {
      await api.delete(
        `/products/${productId}/groups/${group._id}/serials/${encodeURIComponent(serial)}`,
      );
      await onSerialsChanged();
    } catch (err) {
      setRemoveError(err.message || "Heqja e serialit dështoi");
    } finally {
      setRemovingSerial(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 py-2 px-4 border-b border-surface-border last:border-0 bg-surface-sunken">
      {/* Serialized units: one row per serial, holder shown as a plain
          label, own action bar, own untag control. */}
      {hasSerials && (
        <div className="rounded-app border border-surface-border bg-surface overflow-hidden divide-y divide-surface-border">
          {serials.map((serial) => (
            <div key={serial} className="flex flex-col gap-1.5 px-3 py-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-meta font-mono text-gray-700 w-28 shrink-0">
                  {serial}
                </span>
                <span className="text-meta text-gray-600">{holderLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SerialActionsBar
                  serial={serial}
                  group={group}
                  employees={employees}
                  {...actions}
                />
                <button
                  type="button"
                  disabled={removingSerial === serial}
                  onClick={() => handleRemoveSerial(serial)}
                  className="text-meta text-gray-400 hover:text-status-danger underline shrink-0 disabled:opacity-50 ml-auto"
                >
                  {removingSerial === serial ? "Duke hequr…" : "Hiq"}
                </button>
              </div>
            </div>
          ))}
          {removeError && (
            <p className={`${errorTextClasses} px-3 py-2`}>{removeError}</p>
          )}
        </div>
      )}

      {/* Anonymous remainder: one row, holder shown as a plain label,
          GroupActionsBar scoped to just this remainder's quantity, plus
          the add-serial control. */}
      {anonymousCount > 0 && (
        <div className="rounded-app border border-surface-border bg-surface px-3 py-2 flex flex-col gap-2">
          <span className="text-meta text-gray-500">
            {anonymousCount} njësi pa serial · {holderLabel}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <GroupActionsBar group={group} employees={employees} {...actions} />
            {!addingSerialOpen && (
              <button
                type="button"
                className="text-meta text-gray-400 hover:text-gray-600 underline ml-auto"
                onClick={() => setAddingSerialOpen(true)}
              >
                Shto serial
              </button>
            )}
          </div>

          {addingSerialOpen && (
            <form
              onSubmit={handleAddSerial}
              className="flex items-center gap-2 pt-1 mt-1 border-t border-surface-border"
            >
              <input
                type="text"
                autoFocus
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
                placeholder="Etiketo një njësi me serial…"
                aria-label="Serial i ri"
                className={`${inputClasses} flex-1 py-1`}
              />
              <button
                type="submit"
                disabled={adding || !newSerial.trim()}
                className={`${buttonSecondaryClasses} text-meta py-1 shrink-0`}
              >
                {adding ? "Duke shtuar…" : "+ Shto"}
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
          {addError && <p className={errorTextClasses}>{addError}</p>}
        </div>
      )}
    </div>
  );
}
