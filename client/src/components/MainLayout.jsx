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
  const firstVisibleTab = TAB_CONFIG.find((t) => t.roles.includes(user.role))?.id;
  const [activeTab, setActiveTab] = useState(firstVisibleTab);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#17202b]">
      <header className="border-b border-[#e4e8ee] bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <img src="/adc-logo.png" alt="ADC — Albanian Development Company" className="h-9 w-auto" />
            <div className="flex items-center gap-3 lg:hidden">
              <span className="max-w-32 truncate text-sm font-semibold text-[#4b5868]">{user.firstName} {user.lastName}</span>
              <button type="button" onClick={logout} className="min-h-11 text-sm font-bold text-[#d94235]">Log out</button>
            </div>
          </div>
          <div className="flex w-full items-center gap-3 lg:w-auto">
            <div className="min-w-0 flex-1 lg:w-80"><GlobalSearch value={searchQuery} onChange={setSearchQuery} /></div>
            <div className="hidden items-center gap-4 lg:flex">
              <span className="text-sm font-semibold text-[#4b5868]">{user.firstName} {user.lastName}</span>
              <button type="button" onClick={logout} className="min-h-11 text-sm font-bold text-[#d94235]">Log out</button>
            </div>
          </div>
        </div>
      </header>
      <TabBar role={user.role} activeTab={activeTab} onChange={setActiveTab} />
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {activeTab === "assets" ? <AssetsTab searchQuery={searchQuery} /> : activeTab === "products" ? <ProductsTab /> : activeTab === "catalog" && user.role === "admin" ? <CatalogTab /> : activeTab === "employees" && user.role === "admin" ? <EmployeesTab /> : null}
      </main>
    </div>
  );
}
