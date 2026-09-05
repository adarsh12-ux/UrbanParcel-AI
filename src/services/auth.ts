import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, GovernmentEmployee, LoginCredentials, AuthResponse } from '../types';

/**
 * Derives avatar initials from a full name.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Maps database Profile + Auth user data into GovernmentEmployee.
 */
export function mapProfileToEmployee(profile: Profile, email?: string): GovernmentEmployee {
  return {
    id: profile.employee_id,
    authUserId: profile.auth_user_id,
    profileId: profile.id,
    name: profile.full_name,
    designation: profile.designation,
    department: profile.department,
    role: profile.role,
    email: email || profile.email || `${profile.employee_id.toLowerCase()}@urbanparcel.gov`,
    isApproved: profile.is_approved,
    avatarInitials: getInitials(profile.full_name || profile.employee_id),
    lastLogin: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today'
  };
}

/**
 * Formats user input (Employee ID or Email) to valid Supabase auth email.
 */
export function formatEmployeeIdToEmail(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  const cleanId = trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${cleanId}@urbanparcel.gov`;
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  /**
   * Real Supabase email/password login with database profile verification and approval check.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const rawId = credentials.employeeId.trim();
    const password = credentials.password || '';

    if (!rawId) {
      return { success: false, error: 'Please enter your Government Employee ID.' };
    }

    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Authentication service is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
      };
    }

    try {
      const email = formatEmployeeIdToEmail(rawId);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        // Generic security message without revealing ID existence
        return {
          success: false,
          error: 'Invalid employee ID or password.'
        };
      }

      // Fetch the employee's database profile record from 'profiles' table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (profileError || !profile) {
        // Sign out since profile record is absent
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Employee record not found in cadastral registry. Please contact your administrator.'
        };
      }

      // Check if employee account is approved by admin
      if (!profile.is_approved) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Access Denied: Your employee account is pending administrator approval.'
        };
      }

      const employee = mapProfileToEmployee(profile, authData.user.email);

      return {
        success: true,
        user: employee,
        token: authData.session?.access_token
      };
    } catch (err) {
      console.error('Authentication error:', err);
      return {
        success: false,
        error: 'Invalid employee ID or password.'
      };
    }
  },

  /**
   * Retrieves the current authenticated user session and validates database approval.
   */
  async getCurrentSession(): Promise<GovernmentEmployee | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;
      if (!authUser) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (error || !profile || !profile.is_approved) {
        return null;
      }

      return mapProfileToEmployee(profile, authUser.email);
    } catch {
      return null;
    }
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
   * Dispatches a real password reset email via Supabase Auth.
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
        return {
          success: true,
          message: 'If this employee ID is registered, instructions to reset your password have been dispatched.'
        };
      }

      return {
        success: true,
        message: 'Password reset instructions have been sent to your registered government email address.'
      };
    } catch {
      return {
        success: true,
        message: 'If this employee ID is registered, instructions to reset your password have been dispatched.'
      };
    }
  }
};
