import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import MainLayout from "./components/MainLayout";

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-body text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <MainLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
