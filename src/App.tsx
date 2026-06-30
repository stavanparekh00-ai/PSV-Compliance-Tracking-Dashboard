import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EquipmentPage } from './pages/EquipmentPage';
import { LocationPage } from './pages/LocationPage';
import { PSVDetailPage } from './pages/PSVDetailPage';

export default function App() {
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
