import { GovernmentEmployee, LoginCredentials, AuthResponse } from '../types';

// Storage keys
const AUTH_SESSION_KEY = 'urbanparcel_auth_session';
const REMEMBER_ME_KEY = 'urbanparcel_remember_me';

/**
 * Approved Government Employee Demo Profiles
 * Note: These are simulated employee identities for prototype demonstration and testing.
 * In a production deployment, this is replaced by an authorized government identity provider (e.g. NIC SSO / Parichay / OIDC).
 */
export const DEMO_GOVERNMENT_EMPLOYEES: GovernmentEmployee[] = [
  {
    id: 'AP-REV-2024',
    name: 'Adarsh Sharma',
    designation: 'Senior Cadastral Surveyor',
    department: 'Department of Land Records & Survey',
    zone: 'Vijayawada Urban Zone 01',
    role: 'Cadastral Officer',
    email: 'adarsh.sharma@gov.in',
    avatarInitials: 'AS',
    securityClearance: 'Level 3 - Cadastral Full Access',
    lastLogin: 'Today, 09:15 AM'
  },
  {
    id: 'MUNI-GIS-881',
    name: 'Priya Sundaram',
    designation: 'Municipal Town Planning GIS Officer',
    department: 'Urban Development & Municipal Administration',
    zone: 'Amaravati Capital Region (CRDA)',
    role: 'Town Planner',
    email: 'priya.sundaram@gov.in',
    avatarInitials: 'PS',
    securityClearance: 'Level 2 - Planning & Vector Analytics',
    lastLogin: 'Yesterday, 04:30 PM'
  },
  {
    id: 'REV-INSP-402',
    name: 'Rajesh Varma',
    designation: 'Revenue Field Inspector',
    department: 'District Revenue & Settlement Office',
    zone: 'Krishna District Cadastral Div 04',
    role: 'Revenue Inspector',
    email: 'rajesh.varma@gov.in',
    avatarInitials: 'RV',
    securityClearance: 'Level 2 - Field Parcel Verification',
    lastLogin: '02 Sep 2026, 11:20 AM'
  }
];

export const authService = {
  /**
   * Prototype Demo Authentication
   * Validates against the approved demo employee IDs.
   *
   * PRODUCTION NOTE:
   * To connect a real government identity provider (e.g., NIC SSO, Parichay, OpenID Connect, OAuth2, SAML 2.0):
   * Replace this method with an HTTP POST call to your backend `/api/auth/login` or redirect to your IDP's authorization endpoint:
   *
   *   const response = await fetch('/api/v1/auth/government-login', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify(credentials)
   *   });
   *   return await response.json();
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate network authentication handshake
    await new Promise(resolve => setTimeout(resolve, 450));

    const normalizedId = credentials.employeeId.trim().toUpperCase();

    if (!normalizedId) {
      return {
        success: false,
        error: 'Please enter your Government Employee ID.'
      };
    }

    if (!credentials.password || credentials.password.trim().length === 0) {
      return {
        success: false,
        error: 'Please enter your account password.'
      };
    }

    // Match against approved demo employee IDs
    const matchedEmployee = DEMO_GOVERNMENT_EMPLOYEES.find(
      emp => emp.id.toUpperCase() === normalizedId
    );

    if (!matchedEmployee) {
      return {
        success: false,
        error: `Employee ID "${normalizedId}" is not registered in the approved cadastral employee registry. (Demo IDs: AP-REV-2024, MUNI-GIS-881, REV-INSP-402)`
      };
    }

    // Generate mock authenticated session token
    const token = `gov_token_${matchedEmployee.id.toLowerCase()}_${Date.now()}`;
    const userSession: GovernmentEmployee = {
      ...matchedEmployee,
      lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today'
    };

    // Store session according to Remember Me preference
    if (credentials.rememberMe) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(userSession));
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
    } else {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(userSession));
      localStorage.removeItem(REMEMBER_ME_KEY);
    }

    return {
      success: true,
      user: userSession,
      token
    };
  },

  /**
   * Retrieves the currently active user session from localStorage or sessionStorage.
   */
  getCurrentUser(): GovernmentEmployee | null {
    try {
      const localData = localStorage.getItem(AUTH_SESSION_KEY);
      if (localData) {
        return JSON.parse(localData);
      }
      const sessionData = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
    } catch {
      return null;
    }
    return null;
  },

  /**
   * Checks if an employee session is active and valid.
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  /**
   * Logs out the user and clears all stored session data.
   */
  logout(): void {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  },

  /**
   * Returns the list of approved demo employee identities for quick selection in demo mode.
   */
  getDemoEmployees(): GovernmentEmployee[] {
    return DEMO_GOVERNMENT_EMPLOYEES;
  }
};
