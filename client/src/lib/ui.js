// Central place for repeated Tailwind class strings so components don't
// retype the same utility combinations. Expanded further in Phase 3
// (Modal, StatusBadge) — keep adding here, don't fork new ad-hoc styles.

export const inputClasses =
  "w-full rounded-app border border-gray-300 px-4 py-2 text-body " +
  "placeholder:text-gray-500 focus:border-accent-600 focus:outline-none " +
  "focus-visible:outline-2 focus-visible:outline-accent-600";

export const labelClasses = "block text-meta font-medium text-gray-700 mb-1";

export const buttonPrimaryClasses =
  "rounded-app bg-accent-600 px-4 py-2 text-body font-medium text-white " +
  "shadow-card hover:bg-accent-700 hover:shadow-cardHover transition-all " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-800";

export const cardClasses =
  "rounded-app border border-surface-border bg-surface p-6 shadow-card " +
  "transition-shadow";

export const errorTextClasses = "text-meta text-status-danger mt-2";

export const modalOverlayClasses =
  "fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50";

export const modalPanelClasses =
  "w-full max-w-md rounded-app bg-surface border border-surface-border p-6 " +
  "shadow-modal max-h-[90vh] overflow-y-auto";

export const buttonSecondaryClasses =
  "rounded-app border border-surface-border bg-surface px-4 py-2 text-body " +
  "font-medium text-gray-700 transition-colors hover:bg-surface-sunken " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-800";
