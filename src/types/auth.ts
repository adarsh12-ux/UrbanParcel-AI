export type EmployeeRole = 'admin' | 'surveyor' | 'planner' | 'inspector';

export interface Profile {
  id: string;
  auth_user_id: string;
  employee_id: string;
  full_name: string;
  department: string;
  designation: string;
  role: EmployeeRole;
  is_approved: boolean;
  created_at: string;
  updated_at?: string;
  email?: string;
}

export interface GovernmentEmployee {
  id: string; // employee_id e.g. 'AP-REV-2024'
  authUserId: string;
  profileId: string;
  name: string;
  designation: string;
  department: string;
  role: EmployeeRole | string;
  email: string;
  isApproved: boolean;
  avatarInitials: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  employeeId: string;
  password?: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: GovernmentEmployee;
  token?: string;
  error?: string;
}

export interface CreateEmployeePayload {
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  designation: string;
  role: EmployeeRole;
  password?: string;
  isApproved: boolean;
}

export interface UpdateEmployeePayload {
  fullName?: string;
  department?: string;
  designation?: string;
  role?: EmployeeRole;
  isApproved?: boolean;
}
