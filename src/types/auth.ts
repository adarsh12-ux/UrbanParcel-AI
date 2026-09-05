export interface GovernmentEmployee {
  id: string; // e.g., 'AP-REV-2024'
  name: string; // e.g., 'Adarsh Sharma'
  designation: string; // e.g., 'Senior Cadastral Surveyor'
  department: string; // e.g., 'Department of Land Records & Survey'
  zone: string; // e.g., 'Vijayawada Urban Zone 01'
  role: 'Cadastral Officer' | 'Town Planner' | 'Revenue Inspector' | 'Admin';
  email: string;
  avatarInitials: string;
  securityClearance: string; // e.g., 'Level 3 - Cadastral Full Access'
  lastLogin: string;
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
