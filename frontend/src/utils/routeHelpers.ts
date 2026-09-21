import { UserRole, DepartmentCode } from '../types';

export const getDestinationRoute = (
  role?: UserRole | string,
  department?: DepartmentCode | string
): string => {
  switch (role) {
    case 'CHIEF_CONTROLLER':
    case 'SECTION_CONTROLLER':
    case 'ADMIN':
    case 'AUDITOR':
      return '/coa';
    case 'DEPT_ENGINEER':
    case 'SITE_SUPERVISOR':
      if (department === 'ENG') return '/eng';
      if (department === 'TRD') return '/trd';
      if (department === 'SNT') return '/snt';
      return '/eng';
    default:
      if (department === 'ENG') return '/eng';
      if (department === 'TRD') return '/trd';
      if (department === 'SNT') return '/snt';
      return '/coa';
  }
};
