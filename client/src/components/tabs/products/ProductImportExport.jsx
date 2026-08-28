import { buttonSecondaryClasses } from "../../../lib/ui";

/**
 * Export button + accessible file-upload control. The input stays natively
 * focusable (sr-only, not display:none) with `peer` so the styled label
 * still shows a visible focus ring on keyboard focus — display:none or
 * plain hidden would break both keyboard operability and the ring.
 */
export default function ProductImportExport({
  exporting,
  importing,
  onExport,
  onImportFile,
}) {
  return (
    <>
      <button
        type="button"
        className={buttonSecondaryClasses}
        onClick={onExport}
        disabled={exporting}
      >
        {exporting ? "Duke eksportuar…" : "Eksporto në Excel"}
      </button>

      <input
        type="file"
        accept=".xlsx"
        onChange={onImportFile}
        className="peer sr-only"
        id="products-import-input"
      />
      <label
        htmlFor="products-import-input"
        className={`${buttonSecondaryClasses} cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-800 ${
          importing ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {importing ? "Duke importuar…" : "Importo nga Excel"}
      </label>
    </>
  );
}
