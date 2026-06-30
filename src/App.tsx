import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EquipmentPage } from './pages/EquipmentPage';
import { LocationPage } from './pages/LocationPage';
import { PSVDetailPage } from './pages/PSVDetailPage';
import { Loader2 } from 'lucide-react';
import { LoginScreen } from './auth/LoginScreen';
import { useAuth } from './auth/AuthContext';

export default function App() {
  const { authed, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!authed) return <LoginScreen />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/equipment/:equipmentId" element={<EquipmentPage />} />
        <Route path="/location/:locationId" element={<LocationPage />} />
        <Route path="/psv/:psvId" element={<PSVDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
