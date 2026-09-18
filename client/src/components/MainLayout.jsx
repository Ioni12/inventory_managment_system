import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "./Header";
import TabBar, { TAB_CONFIG } from "./TabBar";
import ProductsTab from "./tabs/ProductsTab";
import CatalogTab from "./tabs/CatalogTab";
import EmployeesTab from "./tabs/EmployeesTab";
import NePerdorimTab from "./tabs/NePerdorimTab";
import FurnitoreTab from "./tabs/FurnitoreTab";
import LogsTab from "./tabs/LogsTab";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const firstVisibleTab = TAB_CONFIG.find((t) =>
    t.roles.includes(user.role),
  )?.id;
  const [activeTab, setActiveTab] = useState(firstVisibleTab);
  const [searchQuery, setSearchQuery] = useState("");

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
