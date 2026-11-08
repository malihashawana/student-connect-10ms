import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Phone, 
  User, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  KeyRound, 
  BookOpen
} from 'lucide-react';
import { translations } from '../translations';
import { api, setToken, setCurrentUser } from '../api';

export default function AuthModal({ onLoginSuccess, lang }) {
  const t = translations[lang] || translations.en;

  // Portal Mode: 'student' | 'staff'
  const [portalMode, setPortalMode] = useState('student');

  // Form Mode: 'login' | 'register'
  const [formMode, setFormMode] = useState('login');

  // Login State
  const [phone, setPhone] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');

  // One registration form for all approved phone numbers.
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    const raw = regPhone.replace(/\D/g, '');
    const normalizedPhone = raw.startsWith('880') ? `0${raw.slice(3)}` : raw;
    if (!regName.trim()) return setRegisterError('Enter your full name.');
    if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) return setRegisterError('Enter a valid Bangladesh phone number.');
    if (regPassword.length < 10 || new TextEncoder().encode(regPassword).length > 72) return setRegisterError('Password must be 10–72 bytes long.');
    if (regPassword !== regConfirmPassword) return setRegisterError('Passwords do not match.');
    setSubmittingRegister(true);
    try {
      await api.registerByPhone({ full_name: regName.trim(), phone: normalizedPhone, password: regPassword });
      setPhone(normalizedPhone);
      setPassword('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegisterSuccess('Registration successful. Please sign in.');
      setFormMode('login');
    } catch (err) {
      setRegisterError(err.message || 'Registration failed.');
    } finally {
      setSubmittingRegister(false);
    }
  };

  // Student Login Submit
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setSubmittingLogin(true);
    setLoginError('');

    try {
      const res = await api.login(phone.trim(), password);
      setToken(res.token);
      setCurrentUser(res.user);
      onLoginSuccess(res.user);
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials. Please verify your phone and password.');
    } finally {
      setSubmittingLogin(false);
    }
  };

  // Staff / Admin Login Submit (Dedicated pathway per PRD Section 2)
  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setSubmittingLogin(true);
    setLoginError('');

    try {
      const res = await api.staffLogin(staffId.trim(), password);
      setToken(res.token);
      setCurrentUser(res.user);
      onLoginSuccess(res.user);
    } catch (err) {
      setLoginError(err.message || 'Invalid Staff ID or credentials.');
    } finally {
      setSubmittingLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E8001D] to-[#931212] shadow-xs text-white font-extrabold text-xl tracking-tight">
          10
        </div>
        <h2 className="text-2xl font-extrabold text-[#111827] tracking-tight">
          Connect<span className="text-[#E8001D]">10ms</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          10 Minute School Student Support & Issue Helpdesk
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Main Auth Card (DESIGN.md: 1px border, 24px radius, no drop shadow) */}
        <div className="bg-white py-7 px-6 sm:px-8 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-5">
          
          {/* Top Portal Toggle: Student vs Staff */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setPortalMode('student');
                setLoginError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                portalMode === 'student'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#E8001D]" />
              <span>{t.student_portal}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalMode('staff');
                setFormMode('login');
                setLoginError('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                portalMode === 'staff'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.staff_portal}</span>
            </button>
          </div>

          {/* ================= STUDENT & CAPTAIN AUTH ================= */}
          {portalMode === 'student' && (
            <div>
              
              {/* Form Toggle: Login vs Register */}
              <div className="flex items-center justify-center gap-6 border-b border-[#E5E7EB] pb-2.5 mb-4">
                <button
                  type="button"
                  onClick={() => setFormMode('login')}
                  className={`text-xs font-bold pb-2 -mb-2.5 transition-colors ${
                    formMode === 'login'
                      ? 'text-[#E8001D] border-b-2 border-[#E8001D]'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.sign_in}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('register');
                  }}
                  className={`text-xs font-bold pb-2 -mb-2.5 transition-colors ${
                    formMode === 'register'
                      ? 'text-[#E8001D] border-b-2 border-[#E8001D]'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.register}
                </button>
              </div>

              {registerSuccess && (
                <div role="status" className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{registerSuccess}</span>
                </div>
              )}

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Student Login Form */}
              {formMode === 'login' && (
                <form onSubmit={handleStudentLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#111827] mb-1">
                      {t.phone} *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="017xxxxxxxx"
                        className="input-ten pl-9 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111827] mb-1">
                      {t.password} *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-ten pl-9"
                      />
                    </div>
                  </div>

                  {/* Primary Action Button - Green #1CAB55 per DESIGN.md */}
                  <button
                    type="submit"
                    disabled={submittingLogin}
                    className="w-full btn-primary text-sm shadow-xs"
                  >
                    {submittingLogin ? 'Signing In...' : t.sign_in}
                  </button>
                </form>
              )}

              {/* Single phone-based registration form */}
              {formMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  {registerError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{registerError}</div>}
                  <div>
                    <label className="block text-xs font-bold mb-1">Full Name *</label>
                    <input className="input-ten" type="text" autoComplete="name" required maxLength={120}
                      value={regName} onChange={e => setRegName(e.target.value)} placeholder="Enter your full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Login Phone Number *</label>
                    <input className="input-ten" type="tel" autoComplete="tel" required
                      value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="01XXXXXXXXX" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Password *</label>
                    <input className="input-ten" type="password" autoComplete="new-password" minLength={10} required
                      value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="At least 10 characters" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Confirm Password *</label>
                    <input className="input-ten" type="password" autoComplete="new-password" minLength={10} required
                      value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} placeholder="Re-enter password" />
                  </div>
                  <button type="submit" disabled={submittingRegister} className="w-full btn-primary text-sm disabled:opacity-50">
                    {submittingRegister ? 'Creating Account...' : 'Register'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ================= SEPARATE STAFF / ADMIN AUTH ================= */}
          {portalMode === 'staff' && (
            <form onSubmit={handleStaffLogin} className="space-y-3.5">
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Support Operations Desk:</strong> Sign in with your official Staff ID or support email.
                </span>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {loginError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Staff ID or Email *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="STAFF-1001 or admin@10ms.com"
                    className="input-ten pl-9 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-ten pl-9"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingLogin}
                className="w-full py-2.5 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {submittingLogin ? 'Authenticating...' : 'Sign In to Staff Desk'}
              </button>
            </form>
          )}


        </div>

      </div>

    </div>
  );
}
