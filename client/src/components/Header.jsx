import GlobalSearch from "./GlobalSearch";

export default function Header({ user, logout, searchQuery, onSearchChange }) {
  return (
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
        <GlobalSearch value={searchQuery} onChange={onSearchChange} />

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
  );
}
