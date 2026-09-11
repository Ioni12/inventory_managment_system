import { useState } from "react";
import { api } from "../../../lib/api";
import {
  inputClasses,
  buttonSecondaryClasses,
  errorTextClasses,
} from "../../../lib/ui";

/**
 * Tag/untag serials on a single group, WITHOUT moving any units. Kept
 * deliberately separate from GroupActionsBar's forms — this never touches
 * quantity or status, it only labels which physical units within the
 * existing bucket are known. Two independent API calls (not a combined
 * form submit like Modal), each with its own inline error, since the
 * backend is the source of truth for uniqueness — no client-side
 * duplicate-checking before sending.
 */
export default function SerialsPanel({ productId, group, onClose, onUpdated }) {
  // NOTE: onUpdated should trigger the same full-list refetch (loadAll)
  // used by every other mutation in this app (see ProductsTab.jsx's
  // groupActionsFor) — not a local merge of the returned product, to
  // stay consistent with the rest of the codebase's convention.
  const [newSerial, setNewSerial] = useState("");
  const [addError, setAddError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingSerial, setRemovingSerial] = useState(null);

  const serials = group.serials ?? [];
  const roomLeft = group.quantity - serials.length;

  async function handleAdd(e) {
    e.preventDefault();
    if (!newSerial.trim()) return;
    setAddError("");
    setAdding(true);
    try {
      await api.post(`/products/${productId}/groups/${group._id}/serials`, {
        serial: newSerial.trim(),
      });
      setNewSerial("");
      await onUpdated();
    } catch (err) {
      setAddError(err.message || "Shtimi i serialit dështoi");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(serial) {
    setRemoveError("");
    setRemovingSerial(serial);
    try {
      await api.delete(
        `/products/${productId}/groups/${group._id}/serials/${encodeURIComponent(serial)}`,
      );
      await onUpdated();
    } catch (err) {
      setRemoveError(err.message || "Heqja e serialit dështoi");
    } finally {
      setRemovingSerial(null);
    }
  }

  return (
    <div className="mt-2 rounded-app border border-surface-border bg-surface p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-meta font-medium text-gray-700">
          Menaxho serialet
        </h4>
        <button
          type="button"
          className="text-meta text-gray-500 underline"
          onClick={onClose}
        >
          Mbyll
        </button>
      </div>

      {serials.length === 0 ? (
        <p className="text-meta text-gray-500 mb-2">
          Asnjë serial i etiketuar ende.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 mb-2">
          {serials.map((serial) => (
            <li key={serial} className="flex items-center gap-2">
              <span className="text-meta text-gray-700 flex-1 font-mono">
                {serial}
              </span>
              <button
                type="button"
                disabled={removingSerial === serial}
                onClick={() => handleRemove(serial)}
                className="text-meta text-status-danger underline shrink-0 disabled:opacity-50"
              >
                {removingSerial === serial ? "Duke hequr…" : "Hiq"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {removeError && <p className={errorTextClasses}>{removeError}</p>}

      <p className="text-meta text-gray-500 mb-2">
        {roomLeft > 0
          ? `${roomLeft} njësi ende pa serial`
          : "Të gjitha njësitë kanë serial"}
      </p>

      {roomLeft > 0 && (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            value={newSerial}
            onChange={(e) => setNewSerial(e.target.value)}
            placeholder="Shto serial…"
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
        </form>
      )}

      {addError && <p className={errorTextClasses}>{addError}</p>}
    </div>
  );
}
