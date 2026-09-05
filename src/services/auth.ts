import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GovernmentEmployee, LoginCredentials, AuthResponse } from '../types';

/**
 * Derives avatar initials from a full name or email identifier.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Maps a Supabase user session to a GovernmentEmployee object.
 */
function mapSupabaseUserToEmployee(user: any): GovernmentEmployee {
  const meta = user.user_metadata || {};
  const emailPrefix = (user.email || '').split('@')[0];

  return {
    id: meta.employee_id || emailPrefix.toUpperCase() || 'EMP-GOV',
    name: meta.full_name || meta.name || emailPrefix || 'Government Officer',
    designation: meta.designation || 'Cadastral Survey Specialist',
    department: meta.department || 'Department of Land Records & Survey',
    zone: meta.zone || 'State Urban Cadastral Zone',
    role: meta.role || 'Cadastral Officer',
    email: user.email || '',
    avatarInitials: getInitials(meta.full_name || meta.name || emailPrefix || 'GO'),
    securityClearance: meta.security_clearance || 'Authorized Cadastral Access',
    lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today'
  };
}

/**
 * Converts a raw Employee ID into a standardized authentication email.
 * If the user inputs an email (contains @), it is used directly.
 * Otherwise, it is formatted to the standard internal employee domain: <employee_id>@urbanparcel.gov
 */
export function formatEmployeeIdToEmail(employeeId: string): string {
  const trimmed = employeeId.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const cleanId = trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${cleanId}@urbanparcel.gov`;
}

export const authService = {
  /**
   * Checks if Supabase backend environment variables are configured.
   */
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  /**
   * Authenticates a government employee against Supabase Auth.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const rawId = credentials.employeeId.trim();
    const password = credentials.password || '';

    if (!rawId) {
      return {
        success: false,
        error: 'Please enter your Government Employee ID.'
      };
    }

    if (!password) {
      return {
        success: false,
        error: 'Please enter your password.'
      };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Authentication service is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      };
    }

    try {
      const email = formatEmployeeIdToEmail(rawId);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        // Generic response to avoid revealing employee account existence
        return {
          success: false,
          error: 'Invalid employee ID or password.'
        };
      }

      const employee = mapSupabaseUserToEmployee(data.user);

      return {
        success: true,
        user: employee,
        token: data.session?.access_token
      };
    } catch (err) {
      console.error('Authentication request error:', err);
      return {
        success: false,
        error: 'Invalid employee ID or password.'
      };
    }
  },

  /**
   * Retrieves the current authenticated user session from Supabase.
   */
  async getCurrentSession(): Promise<GovernmentEmployee | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        return mapSupabaseUserToEmployee(data.session.user);
      }
    } catch {
      return null;
    }
    return null;
  },

  /**
   * Signs out the user and clears Supabase session tokens.
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out:', err);
      }
    }
  },

  /**
   * Initiates a password reset email via Supabase Auth.
   */
  async resetPassword(employeeIdOrEmail: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        message: 'Authentication service is not configured. Please check your .env settings.'
      };
    }

    const email = formatEmployeeIdToEmail(employeeIdOrEmail);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      });

      if (error) {
        // Return a generic security response
        return {
          success: true,
          message: 'If this employee ID is registered, instructions to reset your password have been dispatched to your authorized email address.'
        };
      }

      return {
        success: true,
        message: 'Password reset instructions have been sent to your registered government email address.'
      };
    } catch {
      return {
        success: true,
        message: 'If this employee ID is registered, instructions to reset your password have been dispatched to your authorized email address.'
      };
    }
  }
};
