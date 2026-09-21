import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, DepartmentCode, User } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  allowedDepartments?: DepartmentCode[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  allowedDepartments,
}) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-control-bg flex items-center justify-center text-cyan-400 font-mono">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
          <span>Verifying Operational Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const getUserHome = (user: User): string => {
    if (user.role === 'ADMIN') return '/coa';
    if (user.department_code === 'ENG') return '/eng';
    if (user.department_code === 'TRD') return '/trd';
    if (user.department_code === 'SNT') return '/snt';
    return '/coa';
  };

  // 1. Role Clearance Check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={getUserHome(user)} replace />;
  }

  // 2. Departmental Isolation Check (Only Admin has universal clearance)
  const isSuperUser = user.role === 'ADMIN';
  if (!isSuperUser && allowedDepartments && allowedDepartments.length > 0 && !allowedDepartments.includes(user.department_code)) {
    return <Navigate to={getUserHome(user)} replace />;
  }

  return <>{children}</>;
};
