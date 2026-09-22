import { useState } from "react";
import { UserPlus, Undo2, Wrench, Trash2 } from "lucide-react";
import {
  buttonSecondaryClasses,
  inputClasses,
  actionChipClasses,
  actionChipDangerClasses,
} from "../lib/ui";

/**
 * Rule #4: quick inline controls, not a full modal per action. Each of the
 * 5 backend operations is a distinct button/mini-form — deliberately not
 * one flexible "edit group" form, since each has different meaning and
 * required inputs (spec is explicit about this).
 *
 * Which actions are offered depends on the group's current status: you
 * can't "return from repair" a group that isn't in repair, etc. Gating
 * this here means the row never shows a button that would just fail
 * against the backend.
 *
 * SCOPE CHANGE (serials feature): this bar now acts on the ANONYMOUS
 * (unserialized) remainder of a group only — not the whole group. Each
 * serialized unit gets its own row with its own SerialActionsBar
 * (quantity always 1, that one serial always included). This bar's
 * quantity is capped at `group.quantity - group.serials.length`, and it
 * never sends a `serials` field — these units aren't tagged, so there's
 * nothing to include. If a group has zero serials, this is functionally
 * identical to the pre-serials-feature behavior (full group quantity).
 *
 * NOTE: "Kthe në magazinë" (return) is still a one-click action with no
 * mini-form — it returns the full anonymous-remainder quantity
 * immediately. Predates this feature, interaction model unchanged here.
 *
 * VISUAL: idle-state actions render as icon+label chips (not underlined
 * text links) to cut visual weight in dense rows. Every chip keeps a
 * native title tooltip and aria-label for legibility on first use and
 * for screen readers. Mini-forms (assign/repair/return-from-repair/
 * decommission) are unchanged — same inline expand-below-row behavior.
 */
export default function GroupActionsBar({
  group,
  employees,
  onAssign,
  onReturn,
  onRepair,
  onReturnFromRepair,
  onDecommission,
}) {
  const [open, setOpen] = useState(null); // null | 'assign' | 'repair' | 'return-from-repair' | 'decommission'
  const [quantity, setQuantity] = useState(1);
  const [toHolder, setToHolder] = useState("");
  const [toStatus, setToStatus] = useState("Ne magazine");

  const serialCount = (group.serials ?? []).length;
  const maxQty = group.quantity - serialCount; // anonymous remainder only
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

  // Nothing anonymous left to act on — this bar has no role for this
  // group (all units are serialized, handled entirely by per-serial rows).
  if (maxQty <= 0) return null;

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

  // --- Idle: show the icon-chip actions valid for this group's status ---
  return (
    <div className="flex flex-wrap items-center gap-1">
      {(group.status === "Ne magazine" || group.status === "Ne perdorim") && (
        <button
          type="button"
          title="Cakto"
          aria-label="Cakto"
          className={actionChipClasses}
          onClick={() => setOpen("assign")}
        >
          <UserPlus size={15} aria-hidden="true" />
          Cakto
        </button>
      )}

      {group.status === "Ne perdorim" && hasHolder && (
        <button
          type="button"
          title="Kthe në magazinë"
          aria-label="Kthe në magazinë"
          className={actionChipClasses}
          onClick={() =>
            onReturn({ fromHolder: group.currentHolder._id, quantity: maxQty })
          }
        >
          <Undo2 size={15} aria-hidden="true" />
          Kthe
        </button>
      )}

      {(group.status === "Ne magazine" || group.status === "Ne perdorim") && (
        <button
          type="button"
          title="Dërgo në riparim"
          aria-label="Dërgo në riparim"
          className={actionChipClasses}
          onClick={() => setOpen("repair")}
        >
          <Wrench size={15} aria-hidden="true" />
          Riparim
        </button>
      )}

      {group.status === "Ne riparim" && (
        <button
          type="button"
          title="Kthe nga riparimi"
          aria-label="Kthe nga riparimi"
          className={actionChipClasses}
          onClick={() => setOpen("return-from-repair")}
        >
          <Undo2 size={15} aria-hidden="true" />
          Kthe nga riparimi
        </button>
      )}

      {group.status !== "Jashte perdorimit" && (
        <button
          type="button"
          title="Nxirre jashtë përdorimit"
          aria-label="Nxirre jashtë përdorimit"
          className={actionChipDangerClasses}
          onClick={() => setOpen("decommission")}
        >
          <Trash2 size={15} aria-hidden="true" />
          Nxirre
        </button>
      )}
    </div>
  );
}
