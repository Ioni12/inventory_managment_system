import { useEffect, useRef, useState } from "react";
import ListInput from "./ListInput";
import {
  inputClasses,
  labelClasses,
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  errorTextClasses,
  modalOverlayClasses,
  modalPanelClasses,
} from "../lib/ui";

/**
 * Generic modal driven by a field-config array. Every add/edit form in the
 * app (Products, Categories, Suppliers, Employees) should render through
 * this, not hand-roll its own <form>.
 *
 * fields: [{ name, label, type: 'text'|'number'|'date'|'select'|'textarea'|'list',
 *            options?: [{value,label}], required?, itemType?, addLabel? }]
 * `list` fields hold an array of strings (e.g. Employee.emails) and render
 * as add/remove text inputs via ListInput. `itemType`/`addLabel` are
 * passed through to ListInput; `options` is ignored for this type.
 * initialValues: object to prefill (edit mode) — pass {} for create mode
 */
export default function Modal({
  title,
  fields,
  initialValues = {},
  onSubmit,
  onClose,
  submitLabel = "Save",
}) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
      // Basic focus trap
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          "input, select, textarea, button:not([disabled])",
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleChange(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...values };
      for (const field of fields) {
        if (field.type === "list") {
          payload[field.name] = (payload[field.name] ?? []).filter(
            (item) => item.trim() !== "",
          );
        }
      }
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={modalOverlayClasses}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={modalPanelClasses}
      >
        <h2 id="modal-title" className="text-heading text-gray-900 mb-4">
          {title}
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          {fields.map((field, i) => (
            <div key={field.name} className="mb-4">
              <label htmlFor={field.name} className={labelClasses}>
                {field.label}
                {field.required && " *"}
              </label>

              {field.type === "select" ? (
                <select
                  id={field.name}
                  ref={i === 0 ? firstFieldRef : undefined}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={inputClasses}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  ref={i === 0 ? firstFieldRef : undefined}
                  required={field.required}
                  rows={3}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={inputClasses}
                />
              ) : field.type === "list" ? (
                <ListInput
                  id={field.name}
                  value={values[field.name]}
                  onChange={(next) => handleChange(field.name, next)}
                  itemType={field.itemType}
                  addLabel={field.addLabel}
                  firstFieldRef={i === 0 ? firstFieldRef : undefined}
                />
              ) : (
                <input
                  id={field.name}
                  ref={i === 0 ? firstFieldRef : undefined}
                  type={field.type ?? "text"}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={inputClasses}
                />
              )}
            </div>
          ))}

          {error && (
            <p role="alert" className={errorTextClasses}>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={buttonSecondaryClasses}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={buttonPrimaryClasses}
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
