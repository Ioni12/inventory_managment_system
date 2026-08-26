export const TAB_CONFIG = [
  { id: "assets", label: "Assets", roles: ["admin", "user"] },
  { id: "products", label: "Products", roles: ["admin", "user"] },
  { id: "catalog", label: "Catalog", roles: ["admin"] },
  { id: "employees", label: "Employees", roles: ["admin"] },
];

export default function TabBar({ role, activeTab, onChange }) {
  const visibleTabs = TAB_CONFIG.filter((tab) => tab.roles.includes(role));
  return (
    <nav aria-label="Main sections" className="mobile-scroll border-b border-[#e4e8ee] bg-white px-4 sm:px-6 lg:px-10">
      <ul className="mx-auto flex w-full max-w-[1440px] gap-1">
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return <li key={tab.id} className="shrink-0"><button type="button" aria-current={isActive ? "page" : undefined} onClick={() => onChange(tab.id)} className={`min-h-12 border-b-2 px-3 text-sm font-bold transition sm:px-4 ${isActive ? "border-[#d94235] text-[#d94235]" : "border-transparent text-[#7a8795] hover:text-[#17202b]"}`}>{tab.label}</button></li>;
        })}
      </ul>
    </nav>
  );
}
