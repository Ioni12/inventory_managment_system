import { useState } from "react";
import { buttonSecondaryClasses, inputClasses } from "../../lib/ui";

/**
 * Two distinct operations, not one flexible edit form — matching the same
 * principle as GroupActionsBar: reassign to a different holder, or return
 * some/all units to stock. A quantity decrease is modeled as a partial
 * return (row shows 5, edit to 3 → return the difference, 2) since there
 * is no "set quantity" endpoint.
 */
export default function NePerdorimRowActions({
  row,
  employees,
  onReassign,
  onReturn,
}) {
  const [open, setOpen] = useState(null); // null | 'reassign' | 'return'
  const [quantity, setQuantity] = useState(row.sasia);
  const [toHolder, setToHolder] = useState("");

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
    </div>
  );
}
