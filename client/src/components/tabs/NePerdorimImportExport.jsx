import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/**
 * Excel-branded action buttons (green=export, blue=import) — intentionally
 * a separate color language from the app's accent token, matching Excel's
 * own branding rather than the app's "one accent" rule.
 *
 * The import control is a real native file input under the hood (needed
 * for the OS file picker and for keyboard/screen-reader operability, rule
 * #9) — `ExcelActionButton` renders as a <motion.label htmlFor=...> instead
 * of a <motion.button> when `htmlFor` is passed, so it still triggers the
 * hidden input on click/Enter/Space like any label does natively.
 *
 * "Done" reflects real operation completion (the `done` prop, driven by
 * `exporting`/`importing` transitioning true→false), not a fixed timer
 * decoupled from actual async duration.
 *
 * `inputId` lets callers give the hidden file input a unique DOM id.
 * Needed because this component is now reused on more than one tab
 * (Products and Ne Perdorim) — two instances with the same hardcoded id
 * would break the <label htmlFor> association. Defaults to the original
 * value so existing callers (ProductsTab) don't need to change anything.
 */
export default function ProductImportExport({
  exporting,
  importing,
  onExport,
  onImportFile,
  inputId = "products-import-input",
}) {
  const justExported = useJustFinished(exporting);
  const justImported = useJustFinished(importing);

  return (
    <div className="flex items-center gap-3">
      <ExcelActionButton
        label="Eksporto në Excel"
        busyLabel="Duke eksportuar…"
        doneLabel="Ruajtur"
        color="#107C41"
        hoverColor="#0C6633"
        busy={exporting}
        done={justExported}
        onClick={onExport}
        icon={<ExportIcon />}
      />

      <input
        type="file"
        accept=".xlsx"
        onChange={onImportFile}
        className="peer sr-only"
        id={inputId}
      />
      <ExcelActionButton
        label="Importo nga Excel"
        busyLabel="Duke importuar…"
        doneLabel="Importuar"
        color="#0F6CBD"
        hoverColor="#0B5AA0"
        busy={importing}
        done={justImported}
        htmlFor={inputId}
        icon={<ImportIcon />}
      />
    </div>
  );
}

// Flips true for a brief window right after `active` (exporting/importing)
// transitions from true to false — i.e. right after the real operation
// finishes — then reverts to idle. Not started by the click itself.
function useJustFinished(active, holdMs = 1400) {
  const [justFinished, setJustFinished] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    if (wasActive.current && !active) {
      setJustFinished(true);
      const t = setTimeout(() => setJustFinished(false), holdMs);
      return () => clearTimeout(t);
    }
    wasActive.current = active;
  }, [active, holdMs]);

  return justFinished;
}

function ExcelActionButton({
  label,
  busyLabel,
  doneLabel,
  color,
  hoverColor,
  busy,
  done,
  htmlFor,
  onClick,
  icon,
}) {
  const Component = htmlFor ? motion.label : motion.button;
  const shownLabel = done ? doneLabel : busy ? busyLabel : label;

  return (
    <Component
      htmlFor={htmlFor}
      onClick={!htmlFor ? onClick : undefined}
      type={!htmlFor ? "button" : undefined}
      disabled={!htmlFor ? busy : undefined}
      whileHover={busy ? {} : { backgroundColor: hoverColor }}
      whileTap={busy ? {} : { scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={`flex items-center gap-2 px-4 py-2 rounded-[4px] font-medium text-white text-[14px] select-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-800 ${
        busy ? "opacity-70 pointer-events-none" : "cursor-pointer"
      }`}
      style={{
        backgroundColor: color,
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <motion.span
        className="flex items-center"
        animate={done ? { rotate: [0, -12, 12, 0] } : { rotate: 0 }}
        transition={{ duration: 0.4 }}
      >
        {icon}
      </motion.span>
      <span className="relative overflow-hidden inline-flex items-center h-[18px]">
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span
              key="done"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center gap-1.5 absolute left-0 whitespace-nowrap"
            >
              <Check size={14} strokeWidth={2.5} />
              {doneLabel}
            </motion.span>
          ) : (
            <motion.span
              key={busy ? "busy" : "label"}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute left-0 whitespace-nowrap"
            >
              {shownLabel}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="opacity-0 whitespace-nowrap">
          {[label, busyLabel, doneLabel].sort((a, b) => b.length - a.length)[0]}
        </span>
      </span>
    </Component>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l4.5 6L6 18h2.6l3.2-4.4L15 18h2.6l-4.5-6L17.6 6H15l-3.2 4.4L8.6 6H6z"
        fill="white"
      />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5M5 17v2a1 1 0 001 1h12a1 1 0 001-1v-2"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
