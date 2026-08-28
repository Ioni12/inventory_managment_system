import { buttonSecondaryClasses, cardClasses } from "../../lib/ui";

/**
 * Shown after a Products Excel import. Persistent until dismissed —
 * skipped-row reasons need to stay on screen long enough to actually read,
 * unlike a toast.
 */
export default function ImportResultPanel({ result, onDismiss }) {
  const { created, updated, skipped = [] } = result;

  return (
    <div className={`${cardClasses} mb-4`}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <h3 className="text-body font-medium text-gray-900">
          Rezultatet e importit
        </h3>
        <button
          type="button"
          className={buttonSecondaryClasses}
          onClick={onDismiss}
        >
          Mbyll
        </button>
      </div>

      <p className="text-body text-gray-700 mb-2">
        <span className="font-medium text-status-success">{created}</span> të
        krijuar, <span className="font-medium text-accent-600">{updated}</span>{" "}
        të përditësuar
        {skipped.length > 0 && (
          <>
            ,{" "}
            <span className="font-medium text-status-danger">
              {skipped.length}
            </span>{" "}
            të anashkaluar
          </>
        )}
        .
      </p>

      {skipped.length > 0 && (
        <div className="mt-3 rounded-app border border-surface-border bg-surface-sunken max-h-56 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-border">
                <th
                  scope="col"
                  className="px-3 py-1.5 text-meta font-medium text-gray-500"
                >
                  Rreshti
                </th>
                <th
                  scope="col"
                  className="px-3 py-1.5 text-meta font-medium text-gray-500"
                >
                  Arsyeja
                </th>
              </tr>
            </thead>
            <tbody>
              {skipped.map((s, i) => (
                <tr
                  key={i}
                  className="border-b border-surface-border last:border-0"
                >
                  <td className="px-3 py-1.5 text-meta text-gray-700">
                    {s.row}
                  </td>
                  <td className="px-3 py-1.5 text-meta text-gray-700">
                    {s.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
