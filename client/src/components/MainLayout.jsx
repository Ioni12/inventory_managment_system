import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import TabBar, { TAB_CONFIG } from "./TabBar";
import GlobalSearch from "./GlobalSearch";
import ProductsTab from "./tabs/ProductsTab";
import CatalogTab from "./tabs/CatalogTab";
import EmployeesTab from "./tabs/EmployeesTab";
import AssetsTab from "./tabs/AssetsTab";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const firstVisibleTab = TAB_CONFIG.find((t) =>
    t.roles.includes(user.role),
  )?.id;
  const [activeTab, setActiveTab] = useState(firstVisibleTab);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b-2 border-accent-600 bg-surface shadow-card">
        <div className="flex items-center justify-between gap-4">
          <img
            src="/adc-logo.png"
            alt="ADC — Albanian Development Company"
            className="h-8 w-auto"
          />

          <div className="flex items-center gap-4 sm:hidden">
            <span className="text-body text-gray-700">
              {user.firstName} {user.lastName}
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-meta text-accent-600 underline focus-visible:outline-2 focus-visible:outline-accent-800"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <GlobalSearch value={searchQuery} onChange={setSearchQuery} />

          <div className="hidden sm:flex items-center gap-4">
            <span className="text-body text-gray-700">
              {user.firstName} {user.lastName}
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-meta text-accent-600 underline focus-visible:outline-2 focus-visible:outline-accent-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <TabBar role={user.role} activeTab={activeTab} onChange={setActiveTab} />

      <main className="p-6">
        {activeTab === "assets" ? (
          <AssetsTab searchQuery={searchQuery} />
        ) : activeTab === "products" ? (
          <ProductsTab />
        ) : activeTab === "catalog" && user.role === "admin" ? (
          <CatalogTab />
        ) : activeTab === "employees" && user.role === "admin" ? (
          <EmployeesTab />
        ) : null}
      </main>
    </div>
  );
}
