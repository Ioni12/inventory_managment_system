import { useState } from "react";
import { api } from "../../lib/api";
import {
  buttonSecondaryClasses,
  inputClasses,
  errorTextClasses,
} from "../../lib/ui";

/**
 * Backend now flattens each Ne Perdorim group into one row per serial
 * plus one row for the anonymous remainder (see getNePerdorim /
 * buildNePerdorimRows). `row.serial` is "" for the anonymous row, a
 * real serial string otherwise — that's the only thing distinguishing
 * the two cases here.
 *
 * Serial row (row.serial !== ""): quantity is always 1, that one serial
 * is always included — no quantity picker needed, matches
 * SerialActionsBar's behavior on the Products tab. Also gets an untag
 * ("Hiq") control, since this is the only place these rows are
 * actionable on this tab.
 *
 * Anonymous row (row.serial === ""): unchanged from before this
 * feature — quantity picker capped at row.sasia, no serials field sent.
 * Also gets a "Shto serial" control to tag one of these units, mirroring
 * GroupRow's anonymous-remainder row on the Products tab.
 */
export default function NePerdorimRowActions({
  row,
  employees,
  onReassign,
  onReturn,
  onSerialsChanged,
}) {
  const [open, setOpen] = useState(null); // null | 'reassign' | 'return'
  const [quantity, setQuantity] = useState(row.sasia);
  const [toHolder, setToHolder] = useState("");
  const [addingSerialOpen, setAddingSerialOpen] = useState(false);
  const [newSerial, setNewSerial] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [serialError, setSerialError] = useState("");

  const isSerialRow = Boolean(row.serial);

  function close() {
    setOpen(null);
    setQuantity(row.sasia);
    setToHolder("");
  }

  function clampedQty() {
    const n = Number(quantity);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, row.sasia);
  }

  async function handleAddSerial(e) {
    e.preventDefault();
    if (!newSerial.trim()) return;
    setSerialError("");
    setAdding(true);
    try {
      await api.post(
        `/products/${row.productId}/groups/${row.groupId}/serials`,
        {
          serial: newSerial.trim(),
        },
      );
      setNewSerial("");
      setAddingSerialOpen(false);
      await onSerialsChanged();
    } catch (err) {
      setSerialError(err.message || "Shtimi i serialit dështoi");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveSerial() {
    setSerialError("");
    setRemoving(true);
    try {
      await api.delete(
        `/products/${row.productId}/groups/${row.groupId}/serials/${encodeURIComponent(row.serial)}`,
      );
      await onSerialsChanged();
    } catch (err) {
      setSerialError(err.message || "Heqja e serialit dështoi");
    } finally {
      setRemoving(false);
    }
  }

  // --- Serial row: quantity=1 + that serial baked in, no picker ---
  if (isSerialRow) {
    if (open === "reassign") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={toHolder}
            onChange={(e) => setToHolder(e.target.value)}
            className={`${inputClasses} py-1 w-40`}
            aria-label="Mbajtësi i ri"
          >
            <option value="" disabled>
              Zgjidh punonjësin…
            </option>
            {employees
              .filter((e) => e._id !== row.holderId)
              .map((e) => (
                <option key={e._id} value={e._id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
          </select>
          <button
            type="button"
            className={`${buttonSecondaryClasses} text-meta py-1`}
            disabled={!toHolder}
            onClick={() => {
              onReassign({
                fromStatus: "Ne perdorim",
                fromHolder: row.holderId,
                toHolder,
                quantity: 1,
                serials: [row.serial],
              });
              close();
            }}
          >
            Konfirmo
          </button>
          <button
            type="button"
            className="text-meta text-gray-500 underline"
            onClick={close}
          >
            Anulo
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="text-meta text-accent-600 underline"
            onClick={() => setOpen("reassign")}
          >
            Rialoko
          </button>
          <button
            type="button"
            className="text-meta text-accent-600 underline"
            onClick={() =>
              onReturn({
                fromHolder: row.holderId,
                quantity: 1,
                serials: [row.serial],
              })
            }
          >
            Kthe në magazinë
          </button>
          <button
            type="button"
            disabled={removing}
            onClick={handleRemoveSerial}
            className="text-meta text-gray-400 hover:text-status-danger underline disabled:opacity-50"
          >
            {removing ? "Duke hequr…" : "Hiq"}
          </button>
        </div>
        {serialError && <p className={errorTextClasses}>{serialError}</p>}
      </div>
    );
  }

  // --- Anonymous row: existing quantity-picker behavior, unchanged,
  // plus a way to tag one of these units with a serial. ---
  if (open === "reassign") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          max={row.sasia}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`${inputClasses} w-16 py-1`}
          aria-label="Sasia"
        />
        <select
          value={toHolder}
          onChange={(e) => setToHolder(e.target.value)}
          className={`${inputClasses} py-1 w-40`}
          aria-label="Mbajtësi i ri"
        >
          <option value="" disabled>
            Zgjidh punonjësin…
          </option>
          {employees
            .filter((e) => e._id !== row.holderId)
            .map((e) => (
              <option key={e._id} value={e._id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
        </select>
        <button
          type="button"
          className={`${buttonSecondaryClasses} text-meta py-1`}
          disabled={!toHolder}
          onClick={() => {
            onReassign({
              fromStatus: "Ne perdorim",
              fromHolder: row.holderId,
              toHolder,
              quantity: clampedQty(),
            });
            close();
          }}
        >
          Konfirmo
        </button>
        <button
          type="button"
          className="text-meta text-gray-500 underline"
          onClick={close}
        >
          Anulo
        </button>
      </div>
    );
  }

  if (open === "return") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          max={row.sasia}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`${inputClasses} w-16 py-1`}
          aria-label="Sasia për kthim"
        />
        <button
          type="button"
          className={`${buttonSecondaryClasses} text-meta py-1`}
          onClick={() => {
            onReturn({ fromHolder: row.holderId, quantity: clampedQty() });
            close();
          }}
        >
          Konfirmo
        </button>
        <button
          type="button"
          className="text-meta text-gray-500 underline"
          onClick={close}
        >
          Anulo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="text-meta text-accent-600 underline"
          onClick={() => setOpen("reassign")}
        >
          Rialoko
        </button>
        <button
          type="button"
          className="text-meta text-accent-600 underline"
          onClick={() => setOpen("return")}
        >
          Kthe në magazinë
        </button>
        {!addingSerialOpen && (
          <button
            type="button"
            className="text-meta text-gray-400 hover:text-gray-600 underline"
            onClick={() => setAddingSerialOpen(true)}
          >
            Shto serial
          </button>
        )}
      </div>

      {addingSerialOpen && (
        <form onSubmit={handleAddSerial} className="flex items-center gap-2">
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
              setSerialError("");
            }}
          >
            Anulo
          </button>
        </form>
      )}
      {serialError && <p className={errorTextClasses}>{serialError}</p>}
    </div>
  );
}
