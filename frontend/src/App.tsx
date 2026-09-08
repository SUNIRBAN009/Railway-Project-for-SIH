import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ControlRoomLayout } from './layouts/ControlRoomLayout';
import { ControlRoomDashboard } from './pages/ControlRoomDashboard';
import { EngDashboard } from './pages/EngDashboard';
import { TrdDashboard } from './pages/TrdDashboard';
import { SntDashboard } from './pages/SntDashboard';
import { BlockDetailPage } from './pages/BlockDetailPage';
import { BigScreenMode } from './pages/BigScreenMode';

import { NetworkMapPage } from './pages/NetworkMap';
import { useCorridorSocket } from './hooks/useCorridorSocket';
import { EmergencyBanner } from './components/common/EmergencyBanner';
import { EmergencyModal } from './components/common/EmergencyModal';
import { AudioChime } from './components/common/AudioChime';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function RealTimeCorridorSubscriber() {
  useCorridorSocket({ corridorCode: 'NDLS-GZB' });
  return (
    <>
      <EmergencyBanner />
      <EmergencyModal />
      <AudioChime />
      <KeyboardShortcutsModal />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <RealTimeCorridorSubscriber />
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/coa" replace />} />

          {/* Protected Operating Console (COA) */}
          <Route
            path="/coa"
            element={
              <ProtectedRoute allowedRoles={['CHIEF_CONTROLLER', 'SECTION_CONTROLLER', 'ADMIN']}>
                <ControlRoomDashboard />
              </ProtectedRoute>
            }
          />

          {/* 4K Panoramic Video Wall Mode */}
          <Route
            path="/bigscreen"
            element={
              <ProtectedRoute allowedRoles={['CHIEF_CONTROLLER', 'SECTION_CONTROLLER', 'ADMIN']}>
                <BigScreenMode />
              </ProtectedRoute>
            }
          />

          {/* Protected Engineering Console (ENG) */}
          <Route
            path="/eng"
            element={
              <ProtectedRoute allowedRoles={['DEPT_ENGINEER', 'SITE_SUPERVISOR', 'CHIEF_CONTROLLER', 'ADMIN']}>
                <EngDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Traction Power Console (TRD) */}
          <Route
            path="/trd"
            element={
              <ProtectedRoute allowedRoles={['DEPT_ENGINEER', 'SITE_SUPERVISOR', 'CHIEF_CONTROLLER', 'ADMIN']}>
                <TrdDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Signal & Telecom Console (SNT) */}
          <Route
            path="/snt"
            element={
              <ProtectedRoute allowedRoles={['DEPT_ENGINEER', 'SITE_SUPERVISOR', 'CHIEF_CONTROLLER', 'ADMIN']}>
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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
