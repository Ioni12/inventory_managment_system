import { inputClasses, buttonSecondaryClasses } from "../lib/ui";

/**
 * Renders an array-of-strings field as add/remove text inputs. Generic —
 * any Modal field with type:"list" uses this, not just Employee.emails.
 * `value` is always treated as an array (never undefined) so callers don't
 * need to guard; `onChange` receives the full updated array each time.
 */
export default function ListInput({
  id,
  value,
  onChange,
  itemType = "text",
  firstFieldRef,
  addLabel = "+ Shto",
}) {
  const items = value ?? [];

  function updateItem(index, newVal) {
    const next = [...items];
    next[index] = newVal;
    onChange(next);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function addItem() {
    onChange([...items, ""]);
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            id={i === 0 ? id : undefined}
            ref={i === 0 ? firstFieldRef : undefined}
            type={itemType}
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            className={`${inputClasses} flex-1`}
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            aria-label="Hiq"
            className="text-meta text-status-danger underline shrink-0"
          >
            Hiq
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className={`${buttonSecondaryClasses} text-meta py-1 self-start`}
      >
        {addLabel}
      </button>
    </div>
  );
}
