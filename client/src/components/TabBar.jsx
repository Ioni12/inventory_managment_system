// Single source of truth for tab visibility. Add a tab here once —
// every place that needs "what tabs can this role see" reads from this,
// nobody re-derives the role check per component.
export const TAB_CONFIG = [
  { id: "products", label: "Products", roles: ["admin", "user"] },
  { id: "ne-perdorim", label: "Ne Perdorim", roles: ["admin", "user"] },
  { id: "catalog", label: "Catalog", roles: ["admin"] },
  { id: "furnitore", label: "Furnitore", roles: ["admin"] },
  { id: "employees", label: "Employees", roles: ["admin"] },
];

export default function TabBar({ role, activeTab, onChange }) {
  const visibleTabs = TAB_CONFIG.filter((tab) => tab.roles.includes(role));

  return (
    <nav
      aria-label="Main sections"
      className="border-b border-surface-border bg-surface px-6"
    >
      <ul className="flex gap-6">
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <li key={tab.id}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onChange(tab.id)}
                className={
                  "py-3 text-body border-b-2 -mb-px transition-colors " +
                  (isActive
                    ? "border-accent-600 text-accent-600 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-800")
                }
              >
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
