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
 *
 * Serials: opt-in only, per-form. If the source group has any serials at
 * all, an explicit "përfshi seriale specifike" toggle appears inside the
 * relevant mini-form. Left untouched (not expanded, nothing selected),
 * behavior is identical to before this feature existed — `serials` is
 * simply omitted from the request body, never sent as `[]` proactively.
 * This is deliberate: a passively-visible multi-select next to a
 * quantity field risks an accidental partial-serial submission (user
 * picks 2 of 5 available serials without meaning to constrain the move).
 * Requiring an explicit toggle makes "I'm choosing specific units" a
 * deliberate act.
 *
 * NOTE: "Kthe në magazinë" (return) is a one-click action with no
 * mini-form — it always returns the full group quantity immediately, no
 * `open` state involved. That interaction model predates this feature
 * and isn't changed here, so specific-serial returns aren't supported by
 * this bar yet. Flagging as a known scope gap rather than silently
 * deciding to rework the return button's UX.
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
  const [useSerials, setUseSerials] = useState(false);
  const [selectedSerials, setSelectedSerials] = useState([]);

  const maxQty = group.quantity;
  const hasHolder = Boolean(group.currentHolder);
  const groupSerials = group.serials ?? [];
  const hasSerials = groupSerials.length > 0;

  function closeAndReset() {
    setOpen(null);
    setQuantity(1);
    setToHolder("");
    setToStatus("Ne magazine");
    setUseSerials(false);
    setSelectedSerials([]);
  }

  function clampedQty() {
    const n = Number(quantity);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, maxQty);
  }

  // Only include `serials` in the request body when the user explicitly
  // opted in AND picked at least one. Otherwise omit the field entirely
  // (never send `serials: []` proactively) so a normal move is untouched.
  function serialsPayload() {
    if (!useSerials || selectedSerials.length === 0) return {};
    return { serials: selectedSerials };
  }

  function toggleSerial(serial) {
    setSelectedSerials((prev) => {
      if (prev.includes(serial)) return prev.filter((s) => s !== serial);
      const qty = clampedQty();
      if (prev.length >= qty) return prev; // capped at chosen quantity
      return [...prev, serial];
    });
  }

  const quantityPicker = (
    <input
      type="number"
      min={1}
      max={maxQty}
      value={quantity}
      onChange={(e) => {
        setQuantity(e.target.value);
        // Re-clamp selection if quantity shrinks below what's picked
        setSelectedSerials((prev) => {
          const n = Number(e.target.value);
          const qty = Number.isFinite(n) && n >= 1 ? Math.min(n, maxQty) : 1;
          return prev.slice(0, qty);
        });
      }}
      className={`${inputClasses} w-20 py-1`}
      aria-label="Sasia"
    />
  );

  // Shared opt-in serial picker block, used inside the 4 form-based
  // actions below. Only rendered at all when the source group has
  // serials — the common serial-less case shows nothing extra.
  const serialPicker = hasSerials && (
    <div className="w-full flex flex-col gap-2">
      <label className="flex items-center gap-2 text-meta text-gray-600">
        <input
          type="checkbox"
          checked={useSerials}
          onChange={(e) => {
            setUseSerials(e.target.checked);
            if (!e.target.checked) setSelectedSerials([]);
          }}
        />
        Përfshi seriale specifike
      </label>

      {useSerials && (
        <div className="flex flex-wrap gap-2 pl-6">
          {groupSerials.map((serial) => {
            const checked = selectedSerials.includes(serial);
            return (
              <label
                key={serial}
                className={`flex items-center gap-1.5 text-meta rounded-app border px-2 py-1 cursor-pointer ${
                  checked
                    ? "border-accent-600 text-accent-700 bg-accent-50"
                    : "border-surface-border text-gray-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSerial(serial)}
                  className="sr-only"
                />
                <span className="font-mono">{serial}</span>
              </label>
            );
          })}
          <span className="text-meta text-gray-500 self-center">
            {selectedSerials.length}/{clampedQty()} zgjedhur
          </span>
        </div>
      )}
    </div>
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
              ...serialsPayload(),
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
        {serialPicker}
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
              ...serialsPayload(),
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
        {serialPicker}
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
              ...serialsPayload(),
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
        {serialPicker}
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
              ...serialsPayload(),
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
        {serialPicker}
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
