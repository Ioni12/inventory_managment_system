import { useState } from "react";
import { buttonSecondaryClasses, inputClasses } from "../lib/ui";

/**
 * Rule #4: quick inline controls, not a full modal per action. Each of the
 * 5 backend operations is a distinct button/mini-form — deliberately not
 * one flexible "edit group" form, since each has different meaning and
 * required inputs (spec is explicit about this).
 *
 * Which actions are offered depends on the group's current status: you
 * can't "return from repair" a group that isn't in repair, etc. Gating
 * this here means the group row never shows a button that would just
 * fail against the backend.
 */
export default function GroupActionsBar({
  group,
  employees,
  onAssign,
  onReturn,
  onRepair,
  onReturnFromRepair,
  onDecommission,
  onDeleteGroup,
}) {
  const [open, setOpen] = useState(null); // null | 'assign' | 'repair' | 'return-from-repair' | 'decommission'
  const [quantity, setQuantity] = useState(1);
  const [toHolder, setToHolder] = useState("");
  const [toStatus, setToStatus] = useState("Ne magazine");

  const maxQty = group.quantity;
  const hasHolder = Boolean(group.currentHolder);

  function closeAndReset() {
    setOpen(null);
    setQuantity(1);
    setToHolder("");
    setToStatus("Ne magazine");
  }

  function clampedQty() {
    const n = Number(quantity);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, maxQty);
  }

  const quantityPicker = (
    <input
      type="number"
      min={1}
      max={maxQty}
      value={quantity}
      onChange={(e) => setQuantity(e.target.value)}
      className={`${inputClasses} w-20 py-1`}
      aria-label="Sasia"
    />
  );

  // --- Assign: available from Ne magazine or Ne perdorim (reassign) ---
  if (open === "assign") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {quantityPicker}
        <select
          value={toHolder}
          onChange={(e) => setToHolder(e.target.value)}
          className={`${inputClasses} py-1 w-40`}
          aria-label="Mbajtësi i ri"
        >
          <option value="" disabled>
            Zgjidh punonjësin…
          </option>
          {employees.map((e) => (
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
            onAssign({
              fromStatus: group.status,
              fromHolder: group.currentHolder?._id ?? null,
              toHolder,
              quantity: clampedQty(),
            });
            closeAndReset();
          }}
        >
          Konfirmo
        </button>
        <button
          type="button"
          className="text-meta text-gray-500 underline"
          onClick={closeAndReset}
        >
          Anulo
        </button>
      </div>
    );
  }

  // --- Repair: from Ne magazine or Ne perdorim ---
  if (open === "repair") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {quantityPicker}
        <button
          type="button"
          className={`${buttonSecondaryClasses} text-meta py-1`}
          onClick={() => {
            onRepair({
              fromStatus: group.status,
              fromHolder: group.currentHolder?._id ?? null,
              quantity: clampedQty(),
            });
            closeAndReset();
          }}
        >
          Konfirmo
        </button>
        <button
          type="button"
          className="text-meta text-gray-500 underline"
          onClick={closeAndReset}
        >
          Anulo
        </button>
      </div>
    );
  }

  // --- Return from repair: holder stays as-is, pick destination status ---
  if (open === "return-from-repair") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {quantityPicker}
        <select
          value={toStatus}
          onChange={(e) => setToStatus(e.target.value)}
          className={`${inputClasses} py-1 w-40`}
          aria-label="Statusi i ri"
        >
          <option value="Ne magazine">Në magazinë</option>
          <option value="Ne perdorim">Në përdorim</option>
        </select>
        <button
          type="button"
          className={`${buttonSecondaryClasses} text-meta py-1`}
          onClick={() => {
            onReturnFromRepair({
              toStatus,
              holder: group.currentHolder?._id ?? null,
              quantity: clampedQty(),
            });
            closeAndReset();
          }}
        >
          Konfirmo
        </button>
        <button
          type="button"
          className="text-meta text-gray-500 underline"
          onClick={closeAndReset}
        >
          Anulo
        </button>
      </div>
    );
  }

  // --- Decommission: more final, requires an explicit confirm step ---
  if (open === "decommission") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {quantityPicker}
        <span className="text-meta text-status-danger">
          Ky veprim nuk kthehet lehtësisht mbrapsht.
        </span>
        <button
          type="button"
          className="text-meta text-white bg-status-danger rounded-app px-3 py-1"
          onClick={() => {
            onDecommission({
              fromStatus: group.status,
              fromHolder: group.currentHolder?._id ?? null,
              quantity: clampedQty(),
            });
            closeAndReset();
          }}
        >
          Po, nxirre jashtë përdorimit
        </button>
        <button
          type="button"
          className="text-meta text-gray-500 underline"
          onClick={closeAndReset}
        >
          Anulo
        </button>
      </div>
    );
  }

  // --- Idle: show the buttons valid for this group's current status ---
  return (
    <div className="flex flex-wrap items-center gap-3">
      {(group.status === "Ne magazine" || group.status === "Ne perdorim") && (
        <button
          type="button"
          className="text-meta text-accent-600 underline"
          onClick={() => setOpen("assign")}
        >
          Cakto
        </button>
      )}

      {group.status === "Ne perdorim" && hasHolder && (
        <button
          type="button"
          className="text-meta text-accent-600 underline"
          onClick={() =>
            onReturn({ fromHolder: group.currentHolder._id, quantity: maxQty })
          }
        >
          Kthe në magazinë
        </button>
      )}

      {(group.status === "Ne magazine" || group.status === "Ne perdorim") && (
        <button
          type="button"
          className="text-meta text-accent-600 underline"
          onClick={() => setOpen("repair")}
        >
          Dërgo në riparim
        </button>
      )}

      {group.status === "Ne riparim" && (
        <button
          type="button"
          className="text-meta text-accent-600 underline"
          onClick={() => setOpen("return-from-repair")}
        >
          Kthe nga riparimi
        </button>
      )}

      {group.status !== "Jashte perdorimit" && (
        <button
          type="button"
          className="text-meta text-status-danger underline"
          onClick={() => setOpen("decommission")}
        >
          Nxirre jashtë përdorimit
        </button>
      )}

      <button
        type="button"
        className="text-meta text-gray-400 underline"
        onClick={() => {
          if (
            window.confirm(
              "Të fshihet ky grup? Ky veprim heq të dhënat përfundimisht.",
            )
          )
            onDeleteGroup(group._id);
        }}
      >
        Fshi grupin
      </button>
    </div>
  );
}
