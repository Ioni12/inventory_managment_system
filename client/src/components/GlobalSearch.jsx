import { inputClasses } from "../lib/ui";

/**
 * Rule #8: single search box, not per-tab. Filters client-side on every
 * keystroke — no separate search button. Currently wired to filter the
 * Assets list (asset code, serial, product name, holder name) since that's
 * the only tab holding those fields; MainLayout decides which tab(s) it
 * applies to.
 */
export default function GlobalSearch({ value, onChange }) {
  return (
    <div className="w-full sm:w-64">
      <label htmlFor="global-search" className="sr-only">
        Search assets
      </label>
      <input
        id="global-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search asset code, serial, product, holder…"
        className={`${inputClasses} py-1.5`}
      />
    </div>
  );
}
