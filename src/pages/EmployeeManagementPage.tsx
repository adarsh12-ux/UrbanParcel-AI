import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  KeyRound,
  Trash2,
  AlertCircle,
  RefreshCw,
  X,
  Filter,
  Building2,
  Briefcase,
  Lock,
  UserCheck
} from 'lucide-react';
import { Profile, EmployeeRole, CreateEmployeePayload } from '../types';
import { employeeService } from '../services/employeeService';
import { authService } from '../services/auth';

export const EmployeeManagementPage: React.FC = () => {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // New employee form state
  const [newEmployee, setNewEmployee] = useState<CreateEmployeePayload>({
    employeeId: '',
    fullName: '',
    email: '',
    department: 'Department of Land Records & Survey',
    designation: 'Cadastral Surveyor',
    role: 'surveyor',
    password: '',
    isApproved: true
  });
  const [addLoading, setAddLoading] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit employee form state
  const [editForm, setEditForm] = useState<{
    fullName: string;
    department: string;
    designation: string;
    role: EmployeeRole;
    isApproved: boolean;
  }>({
    fullName: '',
    department: '',
    designation: '',
    role: 'surveyor',
    isApproved: true
  });
  const [editLoading, setEditLoading] = useState<boolean>(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load employee registry. Ensure your Supabase database schema has been executed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const showBanner = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  const handleToggleApproval = async (emp: Profile) => {
    try {
      const updated = await employeeService.updateEmployeeApproval(emp.id, !emp.is_approved);
      setEmployees(prev => prev.map(item => item.id === emp.id ? updated : item));
      showBanner(`Status for employee ${emp.employee_id} updated to ${!emp.is_approved ? 'Approved' : 'Disabled'}.`);
    } catch (err: any) {
      alert(`Failed to update approval status: ${err.message}`);
    }
  };

  const handleOpenEdit = (emp: Profile) => {
    setSelectedEmployee(emp);
    setEditForm({
      fullName: emp.full_name,
      department: emp.department,
      designation: emp.designation,
      role: emp.role,
      isApproved: emp.is_approved
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setEditLoading(true);
    try {
      const updated = await employeeService.updateEmployee(selectedEmployee.id, {
        fullName: editForm.fullName,
        department: editForm.department,
        designation: editForm.designation,
        role: editForm.role,
        isApproved: editForm.isApproved
      });
      setEmployees(prev => prev.map(item => item.id === selectedEmployee.id ? updated : item));
      setShowEditModal(false);
      showBanner(`Employee ${selectedEmployee.employee_id} updated successfully.`);
    } catch (err: any) {
      alert(`Error updating employee: ${err.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);

    if (!newEmployee.employeeId.trim()) {
      setAddError('Government Employee ID is required.');
      setAddLoading(false);
      return;
    }

    if (!newEmployee.fullName.trim()) {
      setAddError('Full name is required.');
      setAddLoading(false);
      return;
    }

    try {
      const result = await employeeService.createEmployee(newEmployee);
      if (!result.success) {
        setAddError(result.error || 'Failed to create employee account.');
      } else {
        setShowAddModal(false);
        setNewEmployee({
          employeeId: '',
          fullName: '',
          email: '',
          department: 'Department of Land Records & Survey',
          designation: 'Cadastral Surveyor',
          role: 'surveyor',
          password: '',
          isApproved: true
        });
        showBanner(`Employee ${newEmployee.employeeId.toUpperCase()} provisioned successfully.`);
        fetchEmployees();
      }
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create employee account.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleSendPasswordReset = async (emp: Profile) => {
    try {
      const res = await authService.resetPassword(emp.employee_id);
      showBanner(res.message);
    } catch (err: any) {
      alert(`Password reset error: ${err.message}`);
    }
  };

  // Filtered employees list
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || emp.role === roleFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' && emp.is_approved) ||
      (statusFilter === 'pending' && !emp.is_approved);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="border-b border-slate-200 pb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-700" />
              <span>Government Employee Administration</span>
            </h1>
            <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-semibold px-2 py-0.5 rounded">
              ADMIN ONLY
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage cadastral personnel authorization, department assignments, and system access clearance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Refresh Employee Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-700' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setAddError(null);
              setShowAddModal(true);
            }}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Government Employee</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Database Connection Notice</span>
          </div>
          <p className="text-[11px] leading-tight">
            {error} Make sure you have run the <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-[10px]">supabase/schema.sql</code> script in your Supabase SQL editor.
          </p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded p-3.5 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search Field */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Employee ID (e.g. AP-REV), Name, or Department..."
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8.5 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-mono"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-teal-700"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="surveyor">Cadastral Surveyor</option>
            <option value="planner">Town Planner</option>
            <option value="inspector">Revenue Inspector</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-teal-700"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved / Active</option>
            <option value="pending">Pending / Disabled</option>
          </select>
        </div>
      </div>

      {/* Employees Table Container */}
      <div className="bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Authorized Personnel Registry ({filteredEmployees.length})
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-700 mx-auto" />
            <p className="font-mono">Loading employee records from Supabase...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs space-y-1.5">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-medium text-slate-700">No matching employee records found.</p>
            <p className="text-[11px] text-slate-400">
              Click <strong className="text-slate-700">Add Government Employee</strong> to provision an authorized user account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Employee ID</th>
                  <th className="px-4 py-2.5">Full Name</th>
                  <th className="px-4 py-2.5">Department & Designation</th>
                  <th className="px-4 py-2.5">Assigned Role</th>
                  <th className="px-4 py-2.5">Access Clearance</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee ID */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span>{emp.employee_id}</span>
                      </div>
                    </td>

                    {/* Full Name */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{emp.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{emp.created_at ? new Date(emp.created_at).toLocaleDateString() : 'Active'}</p>
                    </td>

                    {/* Department & Designation */}
                    <td className="px-4 py-3">
                      <p className="text-slate-800 font-medium">{emp.designation}</p>
                      <p className="text-[11px] text-slate-500">{emp.department}</p>
                    </td>

                    {/* Role Badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                        emp.role === 'admin'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : emp.role === 'surveyor'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : emp.role === 'planner'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {emp.role}
                      </span>
                    </td>

                    {/* Approval Status Toggle */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleApproval(emp)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          emp.is_approved
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        {emp.is_approved ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Approved (Active)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Disabled / Pending</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          title="Edit Details & Role"
                          className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendPasswordReset(emp)}
                          title="Trigger Password Reset"
                          className="p-1.5 rounded text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-lg max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Add Government Employee</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Employee ID */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Employee ID <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEmployee.employeeId}
                    onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                    placeholder="e.g. AP-REV-7492"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono uppercase focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEmployee.fullName}
                    onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                    placeholder="e.g. K. Sundar Rao"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              {/* Email & Initial Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Official Email (Optional)</label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="Default: <id>@urbanparcel.gov"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Temporary Password</label>
                  <input
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              {/* Department & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Designation</label>
                  <input
                    type="text"
                    value={newEmployee.designation}
                    onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              {/* Role & Immediate Approval */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">System Role</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value as EmployeeRole })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="surveyor">Cadastral Surveyor</option>
                    <option value="planner">Town Planner</option>
                    <option value="inspector">Revenue Inspector</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newEmployee.isApproved}
                      onChange={(e) => setNewEmployee({ ...newEmployee, isApproved: e.target.checked })}
                      className="rounded border-slate-300 text-teal-700 focus:ring-teal-700 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-semibold">Authorize Access Immediately</span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {addLoading ? 'Creating Account...' : 'Provision Employee Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Employee: {selectedEmployee.employee_id}
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Department</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Designation</label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as EmployeeRole })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                  >
                    <option value="surveyor">Cadastral Surveyor</option>
                    <option value="planner">Town Planner</option>
                    <option value="inspector">Revenue Inspector</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.isApproved}
                      onChange={(e) => setEditForm({ ...editForm, isApproved: e.target.checked })}
                      className="rounded border-slate-300 text-teal-700 focus:ring-teal-700 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-semibold">Access Approved</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium cursor-pointer disabled:opacity-60"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
