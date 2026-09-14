import { useState } from "react";
import { buttonSecondaryClasses, inputClasses } from "../lib/ui";

/**
 * Same status-gated action set as GroupActionsBar's idle row, but scoped
 * to exactly one serialized unit. `quantity: 1` and `serials: [serial]`
 * are always sent automatically — no quantity picker, no opt-in toggle,
 * since the row itself IS the selection. "Cakto" still needs a holder
 * pick (a destination is required either way), same as the group-level
 * assign form, just for 1 unit.
 *
 * Deliberately does NOT render "Fshi grupin" — deleting the whole group
 * from a single serial's row would delete every other unit in the same
 * bucket too, which doesn't match "acting on this one unit."
 */
export default function SerialActionsBar({
  serial,
  group,
  employees,
  onAssign,
  onReturn,
  onRepair,
  onReturnFromRepair,
  onDecommission,
}) {
  const [open, setOpen] = useState(null); // null | 'assign' | 'return-from-repair'
  const [toHolder, setToHolder] = useState("");
  const [toStatus, setToStatus] = useState("Ne magazine");

  const hasHolder = Boolean(group.currentHolder);

  function closeAndReset() {
    setOpen(null);
    setToHolder("");
    setToStatus("Ne magazine");
  }

  // --- Assign: needs a destination holder, so still a mini-form ---
  if (open === "assign") {
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
              quantity: 1,
              serials: [serial],
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

  // --- Return from repair: needs a destination status ---
  if (open === "return-from-repair") {
    return (
      <div className="flex flex-wrap items-center gap-2">
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
              quantity: 1,
              serials: [serial],
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

  // --- Idle: one-click actions, quantity/serial already implied ---
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
            onReturn({
              fromHolder: group.currentHolder._id,
              quantity: 1,
              serials: [serial],
            })
          }
        >
          Kthe në magazinë
        </button>
      )}

      {(group.status === "Ne magazine" || group.status === "Ne perdorim") && (
        <button
          type="button"
          className="text-meta text-accent-600 underline"
          onClick={() =>
            onRepair({
              fromStatus: group.status,
              fromHolder: group.currentHolder?._id ?? null,
              quantity: 1,
              serials: [serial],
            })
          }
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
          onClick={() => {
            if (
              window.confirm(
                `Të nxirret jashtë përdorimit njësia me serial ${serial}?`,
              )
            )
              onDecommission({
                fromStatus: group.status,
                fromHolder: group.currentHolder?._id ?? null,
                quantity: 1,
                serials: [serial],
              });
          }}
        >
          Nxirre jashtë përdorimit
        </button>
      )}
    </div>
  );
}
