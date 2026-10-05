import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "./Header";
import TabBar, { TAB_CONFIG } from "./TabBar";
import ProductsTab from "./tabs/ProductsTab";
import AllProductsTab from "./tabs/AllProductsTab";
import CatalogTab from "./tabs/CatalogTab";
import EmployeesTab from "./tabs/EmployeesTab";
import NePerdorimTab from "./tabs/NePerdorimTab";
import FurnitoreTab from "./tabs/FurnitoreTab";
import LogsTab from "./tabs/LogsTab";

export default function MainLayout() {
  const { user, logout } = useAuth();

  const visibleTabs = TAB_CONFIG.filter((t) => t.roles.includes(user.role));
  const firstVisibleTab = visibleTabs[0]?.id;

  const getTabFromHash = () => {
    const id = window.location.hash.slice(1);
    return visibleTabs.some((t) => t.id === id) ? id : firstVisibleTab;
  };

  const [activeTab, setActiveTabState] = useState(getTabFromHash);
  const [searchQuery, setSearchQuery] = useState("");

  const setActiveTab = (id) => {
    window.location.hash = id;
    setActiveTabState(id);
  };

  // Keep state in sync with back/forward buttons
  useEffect(() => {
    const onHashChange = () => setActiveTabState(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role]);

  return (
    <div className="min-h-screen bg-surface-page">
      <Header
        user={user}
        logout={logout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <TabBar role={user.role} activeTab={activeTab} onChange={setActiveTab} />

      <main className="p-6">
        {activeTab === "products" ? (
          <ProductsTab searchQuery={searchQuery} />
        ) : activeTab === "all-products" ? (
          <AllProductsTab searchQuery={searchQuery} />
        ) : activeTab === "ne-perdorim" ? (
          <NePerdorimTab />
        ) : activeTab === "catalog" && user.role === "admin" ? (
          <CatalogTab />
        ) : activeTab === "furnitore" && user.role === "admin" ? (
          <FurnitoreTab />
        ) : activeTab === "logs" && user.role === "admin" ? (
          <LogsTab />
        ) : activeTab === "employees" && user.role === "admin" ? (
          <EmployeesTab />
        ) : null}
      </main>
    </div>
  );
}
