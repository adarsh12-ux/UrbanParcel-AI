import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, CreateEmployeePayload, UpdateEmployeePayload } from '../types';
import { formatEmployeeIdToEmail } from './auth';

export const employeeService = {
  /**
   * Retrieves all government employee profiles from Supabase.
   * Admin-only RLS policy applies.
   */
  async getEmployees(): Promise<Profile[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch employee profiles:', error);
      throw error;
    }

    return (data || []) as Profile[];
  },

  /**
   * Updates an employee's approval status (Approve or Disable account).
   */
  async updateEmployeeApproval(profileId: string, isApproved: boolean): Promise<Profile> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client not configured.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_approved: isApproved,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update approval status:', error);
      throw error;
    }

    return data as Profile;
  },

  /**
   * Updates an employee's role, designation, or department.
   */
  async updateEmployee(profileId: string, payload: UpdateEmployeePayload): Promise<Profile> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client not configured.');
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (payload.fullName !== undefined) updateData.full_name = payload.fullName;
    if (payload.department !== undefined) updateData.department = payload.department;
    if (payload.designation !== undefined) updateData.designation = payload.designation;
    if (payload.role !== undefined) updateData.role = payload.role;
    if (payload.isApproved !== undefined) updateData.is_approved = payload.isApproved;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update employee profile:', error);
      throw error;
    }

    return data as Profile;
  },

  /**
   * Registers a new authorized employee account in Supabase Auth and creates their profile.
   */
  async createEmployee(payload: CreateEmployeePayload): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client not configured.');
    }

    const email = payload.email?.trim() || formatEmployeeIdToEmail(payload.employeeId);
    const tempPassword = payload.password || `Gov@${Math.random().toString(36).slice(-8)}#2026`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            employee_id: payload.employeeId.trim().toUpperCase(),
            full_name: payload.fullName.trim(),
            department: payload.department.trim(),
            designation: payload.designation.trim(),
            role: payload.role,
            is_approved: payload.isApproved
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // If user was created, also ensure profile record exists
      if (data.user) {
        const { error: insertError } = await supabase
          .from('profiles')
          .upsert({
            auth_user_id: data.user.id,
            employee_id: payload.employeeId.trim().toUpperCase(),
            full_name: payload.fullName.trim(),
            department: payload.department.trim(),
            designation: payload.designation.trim(),
            role: payload.role,
            is_approved: payload.isApproved,
            updated_at: new Date().toISOString()
          }, { onConflict: 'auth_user_id' });

        if (insertError) {
          console.warn('Profile upsert note:', insertError);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create employee account.' };
    }
  },

  /**
   * Deletes an employee profile record.
   */
  async deleteEmployee(profileId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client not configured.');
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (error) {
      throw error;
    }
  }
};
