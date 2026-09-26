import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/authStore';
import { useBlockStore } from './stores/blockStore';
import { ControlRoomLayout } from './layouts/ControlRoomLayout';
import { ControlRoomDashboard } from './pages/ControlRoomDashboard';
import { EngDashboard } from './pages/EngDashboard';
import { TrdDashboard } from './pages/TrdDashboard';
import { SntDashboard } from './pages/SntDashboard';
import { BlockDetailPage } from './pages/BlockDetailPage';
import { BigScreenMode } from './pages/BigScreenMode';
import { NetworkMapPage } from './pages/NetworkMap';
import { MasterDataPage } from './pages/MasterDataPage';
import { useCorridorSocket } from './hooks/useCorridorSocket';
import { EmergencyBanner } from './components/common/EmergencyBanner';
import { EmergencyModal } from './components/common/EmergencyModal';
import { AudioChime } from './components/common/AudioChime';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SanctionAcknowledgementModal } from './components/common/SanctionAcknowledgementModal';
import { ToastContainer } from './components/common/ToastContainer';
import { DemoControllerToolbar } from './components/common/DemoControllerToolbar';

function RealTimeCorridorSubscriber() {
  useCorridorSocket({ corridorCode: 'NDLS-GZB' });
  const { user } = useAuthStore();
  const isAdminOrChief = user?.role === 'ADMIN' || user?.role === 'CHIEF_CONTROLLER';

  return (
    <>
      <ToastContainer />
      {isAdminOrChief && <DemoControllerToolbar />}
      <EmergencyBanner />
      <EmergencyModal />
      <AudioChime />
      <KeyboardShortcutsModal />
      <SanctionAcknowledgementModal />
    </>
  );
}

const RoleBasedRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'ADMIN') {
    return <Navigate to="/coa" replace />;
  }
  if (user.department_code === 'ENG') {
    return <Navigate to="/eng" replace />;
  }
  if (user.department_code === 'TRD') {
    return <Navigate to="/trd" replace />;
  }
  if (user.department_code === 'SNT') {
    return <Navigate to="/snt" replace />;
  }
  if (user.role === 'CHIEF_CONTROLLER' || user.role === 'SECTION_CONTROLLER' || user.department_code === 'OPERATIONS') {
    return <Navigate to="/coa" replace />;
  }
  return <Navigate to="/coa" replace />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <RealTimeCorridorSubscriber />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/dashboard" element={<RoleBasedRedirect />} />

            {/* Protected Operating Console (COA) */}
            <Route
              path="/coa"
              element={
                <ProtectedRoute 
                  allowedRoles={['CHIEF_CONTROLLER', 'SECTION_CONTROLLER', 'ADMIN']}
                  allowedDepartments={['OPERATIONS']}
                >
                  <ControlRoomDashboard />
                </ProtectedRoute>
              }
            />

            {/* 4K Panoramic Video Wall Mode */}
            <Route
              path="/bigscreen"
              element={
                <ProtectedRoute 
                  allowedRoles={['CHIEF_CONTROLLER', 'SECTION_CONTROLLER', 'ADMIN']}
                  allowedDepartments={['OPERATIONS']}
                >
                  <BigScreenMode />
                </ProtectedRoute>
              }
            />

          {/* Protected Engineering Console (ENG) */}
          <Route
            path="/eng"
            element={
              <ProtectedRoute 
                allowedRoles={['DEPT_ENGINEER', 'SITE_SUPERVISOR', 'ADMIN']}
                allowedDepartments={['ENG']}
              >
                <EngDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Traction Power Console (TRD) */}
          <Route
            path="/trd"
            element={
              <ProtectedRoute 
                allowedRoles={['DEPT_ENGINEER', 'SITE_SUPERVISOR', 'ADMIN']}
                allowedDepartments={['TRD']}
              >
                <TrdDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Signal & Telecom Console (SNT) */}
          <Route
            path="/snt"
            element={
              <ProtectedRoute 
                allowedRoles={['DEPT_ENGINEER', 'SITE_SUPERVISOR', 'ADMIN']}
                allowedDepartments={['SNT']}
              >
                <SntDashboard />
              </ProtectedRoute>
            }
          />

            {/* Protected Block Inspection Details */}
            <Route
              path="/blocks/:id"
              element={
                <ProtectedRoute>
                  <ControlRoomLayout>
                    <BlockDetailPage />
                  </ControlRoomLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected 3D GIS Digital Twin */}
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <NetworkMapPage />
                </ProtectedRoute>
              }
            />

            {/* Master Ground-Truth Data & GeoJSON Inspector */}
            <Route
              path="/master-data"
              element={
                <ProtectedRoute>
                  <MasterDataPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/master-data"
              element={
                <ProtectedRoute>
                  <MasterDataPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
