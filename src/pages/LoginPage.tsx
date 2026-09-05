import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Building2,
  MapPin,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  X,
  FileText,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_GOVERNMENT_EMPLOYEES } from '../services/auth';
import { GovernmentEmployee } from '../types';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // If already authenticated, redirect to destination or dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const destination = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId.trim()) {
      setError('Please enter your Government Employee ID.');
      return;
    }

    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login({
        employeeId: employeeId.trim(),
        password,
        rememberMe
      });

      if (response.success) {
        const destination = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } else {
        setError(response.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setError('A system error occurred during authentication handshake. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoUser = (emp: GovernmentEmployee) => {
    setEmployeeId(emp.id);
    setPassword('DemoGov#2024');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-teal-700 selection:text-white">
      {/* Top Institutional Government Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline font-semibold">STATE CADASTRAL LAND RECORDS & GIS NETWORK</span>
            <span className="sm:hidden font-semibold">STATE CAD-GIS PORTAL</span>
          </div>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline text-[11px] text-slate-400 font-medium">NIC / e-Governance Cadastral Node</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
            PROTOTYPE BUILD
          </span>
          <span className="hidden sm:inline">SEC-LEVEL: HIGH</span>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Government GIS Branding & Information */}
        <div className="lg:col-span-7 space-y-6 lg:pr-6">
          {/* Main Seal & Brand */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-teal-400 text-xs font-mono">
              <Compass className="w-4 h-4 text-teal-400" />
              <span>CADASTRAL GEOSPATIAL INTELLIGENCE PLATFORM</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-teal-700 flex items-center justify-center text-white shadow-md border border-teal-600">
                <Compass className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">UrbanParcel</h1>
                  <span className="bg-slate-800 text-teal-300 text-xs font-mono font-semibold px-1.5 py-0.5 rounded border border-slate-700">AI</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-300 tracking-wide uppercase">
                  Government GIS & Cadastral Information System
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
              Authorized access for government survey, revenue administration, and municipal town planning personnel. Secure multi-tier platform for high-resolution UAV orthomosaic vectorization and cadastral land records.
            </p>
          </div>

          {/* Key Cadastral Capabilities Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded space-y-1">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                <Layers className="w-4 h-4 text-teal-400 shrink-0" />
                <span>UAV Orthomosaic Ingestion</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Direct raster processing for centimetre-grade GeoTIFF imagery with embedded RTK GPS coordinates.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded space-y-1">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Deep Learning Parcel Extraction</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Automated building footprint and polygon boundary vectorization adhering to standard survey margins.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded space-y-1">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Cadastral Boundary Validation</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Topological discrepancy checks and spatial intersection analysis against official revenue records.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded space-y-1">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold">
                <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Government Survey Export</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Compliant GIS layer formats: GeoJSON, ESRI Shapefile, DXF/CAD, and municipal survey registers.
              </p>
            </div>
          </div>

          {/* Institutional Compliance Advisory */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-slate-200 font-semibold text-[11px]">Restricted Government Network System</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                All cadastral vector actions, raster queries, and survey edits are audit-logged with cryptographically verifiable employee timestamps.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Professional Government Employee Login Card */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-md p-6 sm:p-7 shadow-lg space-y-5">
            {/* Card Header */}
            <div className="border-b border-slate-200 pb-3 space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-700" />
                  <span>Government Employee Login</span>
                </h2>
                <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-semibold px-2 py-0.5 rounded">
                  PORTAL AUTH
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Enter your official employee credentials to access the cadastral GIS portal.
              </p>
            </div>

            {/* Prototype Demo Mode Notice & Quick Selection */}
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Info className="w-3.5 h-3.5 text-teal-700" />
                  <span>Prototype Demo Mode</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Select Sample Identity</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                This prototype simulates official employee authentication. Click any approved profile below to auto-fill demo credentials:
              </p>

              {/* Sample Employee Quick-Fill Chips */}
              <div className="space-y-1.5 pt-0.5">
                {DEMO_GOVERNMENT_EMPLOYEES.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(emp)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs border transition-colors flex items-center justify-between cursor-pointer ${
                      employeeId === emp.id
                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-mono font-semibold text-[11px] mr-1.5 text-slate-900">{emp.id}</span>
                      <span className="text-slate-600 font-medium text-[11px]">{emp.name}</span>
                      <span className="text-slate-400 text-[10px] hidden sm:inline ml-1">({emp.role})</span>
                    </div>
                    {employeeId === emp.id ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 ml-1" />
                    ) : (
                      <span className="text-[10px] font-mono text-teal-700 shrink-0 ml-1">Auto-Fill</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded flex items-start gap-2 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Employee ID Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Government Employee ID <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. AP-REV-2024 or MUNI-GIS-881"
                    autoComplete="username"
                    className="w-full bg-white border border-slate-300 rounded pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-mono uppercase transition-colors"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-800">
                    Password <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-teal-800 hover:text-teal-900 hover:underline font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full bg-white border border-slate-300 rounded pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-700 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Remember me on this workstation</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Cadastral Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Warning / Restriction Footer inside Card */}
            <div className="pt-3 border-t border-slate-100 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                <span>Authorized Personnel Only</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Access is restricted to approved government employees. Unauthorized access attempts are monitored and recorded under State Cyber Regulations.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password / Token Assistance Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-300 rounded-md max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">Government Credential Assistance</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                In accordance with state e-Governance security protocols, government employee passwords and 2FA tokens cannot be reset through public self-service links.
              </p>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1.5 font-mono text-[11px] text-slate-700">
                <p className="font-bold text-slate-900 font-sans">Official Support Channels:</p>
                <p>• <strong>District Nodal Officer:</strong> Contact your District Settlement & Survey Directorate</p>
                <p>• <strong>NIC Cadastral Helpdesk:</strong> support.gis@nic.in</p>
                <p>• <strong>Toll-Free e-Governance Line:</strong> 1800-425-SURVEY (Mon–Sat, 09:00–17:30 IST)</p>
              </div>
              <p className="text-[11px] text-slate-500">
                For prototype testing, please use the sample Employee IDs listed on the login card with any standard password.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3.5 px-4 text-center text-xs text-slate-500 space-y-1">
        <p className="font-mono text-[11px] text-slate-400">
          UrbanParcelAI | Cadastral Land Information System
        </p>
        <p className="text-[10px] text-slate-600">
          Department of Urban Development & Municipal Administration • National Informatics Centre Standard GIS Architecture
        </p>
      </footer>
    </div>
  );
};
