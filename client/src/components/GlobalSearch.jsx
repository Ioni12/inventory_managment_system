import { inputClasses } from "../lib/ui";

/**
 * Rule #8: single search box, not per-tab. Filters client-side on every
 * keystroke — no separate search button. Wired to filter Products and
 * All Products (Asset ID, name, branding, serial).
 */
export default function GlobalSearch({ value, onChange }) {
  return (
    <div className="w-full sm:w-64">
      <label htmlFor="global-search" className="sr-only">
        Kërko produkte
      </label>
      <input
        id="global-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Asset ID, emër, serial…"
        className={`${inputClasses} py-1.5`}
      />
    </div>
  );
}
