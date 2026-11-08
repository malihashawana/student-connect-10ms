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

  // Registration Wizard (Step 1: Verify Roster, Step 2: Set Password & Profile)
  const [regStep, setRegStep] = useState(1);
  const [regTms, setRegTms] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regProgram, setRegProgram] = useState('HSC 28');
  const [verifyingRoster, setVerifyingRoster] = useState(false);
  const [verifiedRosterData, setVerifiedRosterData] = useState(null);
  const [rosterVerifyError, setRosterVerifyError] = useState('');

  // Step 2 Fields
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDept, setRegDept] = useState('Science'); // Science / Commerce / Arts
  const [regCollege, setRegCollege] = useState('');
  const [regDistrict, setRegDistrict] = useState('Dhaka');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [submittingRegister, setSubmittingRegister] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Quick Demo Logins
  const handleDemoFill = async (type) => {
    setLoginError('');
    if (type === 'science') {
      setPortalMode('student');
      setPhone('01811000002');
      setPassword('student123');
    } else if (type === 'business') {
      setPortalMode('student');
      setPhone('01911000003');
      setPassword('student123');
    } else if (type === 'humanities') {
      setPortalMode('student');
      setPhone('01611000004');
      setPassword('student123');
    } else if (type === 'captain') {
      setPortalMode('student');
      setPhone('01711000001');
      setPassword('captain123');
    } else if (type === 'staff') {
      setPortalMode('staff');
      setStaffId('STAFF-1002');
      setPassword('admin123');
    } else if (type === 'admin') {
      setPortalMode('staff');
      setStaffId('STAFF-1001');
      setPassword('admin123');
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

  // Step 1: Verify Roster
  const handleVerifyRosterSubmit = async (e) => {
    e.preventDefault();
    if (!regTms || !regPhone || !regProgram) return;

    setVerifyingRoster(true);
    setRosterVerifyError('');

    try {
      const res = await api.verifyRoster(regTms.trim(), regPhone.trim(), regProgram);
      setVerifiedRosterData(res.data);
      if (res.data.suggested_name) setRegName(res.data.suggested_name);
      setRegStep(2);
    } catch (err) {
      setRosterVerifyError(err.message || 'Entitlement verification failed.');
    } finally {
      setVerifyingRoster(false);
    }
  };

  // Step 2: Complete Registration
  const handleCompleteRegister = async (e) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      setRegisterError(lang === 'bn' ? 'পাসওয়ার্ড দুইটি মেলেনি।' : 'Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setRegisterError(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      return;
    }

    setSubmittingRegister(true);
    setRegisterError('');

    try {
      const deptNormalized = regDept === 'Commerce' ? 'Business Studies' : regDept === 'Arts' ? 'Humanities' : 'Science';

      const payload = {
        tms_id: verifiedRosterData.tms_id,
        phone: verifiedRosterData.phone,
        program: verifiedRosterData.program,
        department: deptNormalized,
        full_name: regName.trim(),
        password: regPassword,
        college: regCollege.trim() || 'Not Specified',
        district: regDistrict,
        email: regEmail.trim(),
        address: regAddress.trim()
      };

      const res = await api.register(payload);
      setToken(res.token);
      setCurrentUser(res.user);
      onLoginSuccess(res.user);
    } catch (err) {
      setRegisterError(err.message || 'Registration failed');
    } finally {
      setSubmittingRegister(false);
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
                    setRegStep(1);
                  }}
                  className={`text-xs font-bold pb-2 -mb-2.5 transition-colors ${
                    formMode === 'register'
                      ? 'text-[#E8001D] border-b-2 border-[#E8001D]'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.register} (with TMS ID)
                </button>
              </div>

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

              {/* Student Registration Wizard */}
              {formMode === 'register' && (
                <div className="space-y-4">
                  
                  {/* Step Indicator */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2 border-b border-[#E5E7EB]">
                    <span>Step {regStep} of 2</span>
                    <span>{regStep === 1 ? 'TMS Entitlement' : 'Profile & Password'}</span>
                  </div>

                  {/* Step 1: Pre-Approval Roster Check */}
                  {regStep === 1 && (
                    <form onSubmit={handleVerifyRosterSubmit} className="space-y-3.5">
                      
                      {rosterVerifyError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                          {rosterVerifyError}
                        </div>
                      )}

                      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                        Enter your approved <strong>TMS Transaction ID</strong> and registered phone number from your 10MS course purchase.
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#111827] mb-1">
                          TMS Transaction ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={regTms}
                          onChange={(e) => setRegTms(e.target.value)}
                          placeholder="e.g. TMS-2026-90001"
                          className="input-ten font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#111827] mb-1">
                          Login Phone Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="01700112233"
                          className="input-ten font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#111827] mb-1">
                          Online Batch / Course *
                        </label>
                        <select
                          value={regProgram}
                          onChange={(e) => setRegProgram(e.target.value)}
                          className="input-ten bg-white font-bold"
                        >
                          <option value="HSC 28">HSC 28 Online Batch</option>
                          <option value="HSC 27">HSC 27 Online Batch</option>
                        </select>
                      </div>

                      {/* Primary Green CTA */}
                      <button
                        type="submit"
                        disabled={verifyingRoster}
                        className="w-full btn-primary text-xs"
                      >
                        <span>{verifyingRoster ? 'Verifying...' : 'Verify Entitlement'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                    </form>
                  )}

                  {/* Step 2: Personal Profile & Password */}
                  {regStep === 2 && (
                    <form onSubmit={handleCompleteRegister} className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
                      
                      {registerError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                          {registerError}
                        </div>
                      )}

                      <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Verified: {verifiedRosterData?.tms_id} ({verifiedRosterData?.program})</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#111827] mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Your full name"
                          className="input-ten"
                        />
                      </div>

                      {/* Group Selection: Science / Commerce / Arts */}
                      <div>
                        <label className="block text-xs font-bold text-[#111827] mb-1">
                          Academic Group *
                        </label>
                        <div className="flex gap-2">
                          {[
                            { id: 'Science', label: 'Science' },
                            { id: 'Commerce', label: 'Commerce' },
                            { id: 'Arts', label: 'Arts' }
                          ].map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setRegDept(g.id)}
                              className={`group-tab ${regDept === g.id ? 'active' : ''}`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-[#111827] mb-1">
                            Password *
                          </label>
                          <input
                            type="password"
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min 6 chars"
                            className="input-ten"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#111827] mb-1">
                            Confirm Password *
                          </label>
                          <input
                            type="password"
                            required
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            placeholder="Re-type password"
                            className="input-ten"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-[#111827] mb-1">
                            College / School
                          </label>
                          <input
                            type="text"
                            value={regCollege}
                            onChange={(e) => setRegCollege(e.target.value)}
                            placeholder="College name"
                            className="input-ten"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#111827] mb-1">
                            District
                          </label>
                          <input
                            type="text"
                            value={regDistrict}
                            onChange={(e) => setRegDistrict(e.target.value)}
                            placeholder="Dhaka"
                            className="input-ten"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setRegStep(1)}
                          className="btn-secondary text-xs"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="submit"
                          disabled={submittingRegister}
                          className="flex-1 btn-primary text-xs"
                        >
                          {submittingRegister ? 'Creating Account...' : 'Complete Registration'}
                        </button>
                      </div>

                    </form>
                  )}

                </div>
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

          {/* Quick Demo Test Buttons */}
          <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Quick 1-Click Demo Logins
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleDemoFill('science')}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold border border-blue-200 transition-colors text-left"
              >
                🔬 Science (HSC 28)
                <span className="block text-[9px] text-blue-600 font-mono">01811000002</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('business')}
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-200 transition-colors text-left"
              >
                💼 Commerce (HSC 28)
                <span className="block text-[9px] text-emerald-600 font-mono">01911000003</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('humanities')}
                className="p-1.5 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 font-bold border border-purple-200 transition-colors text-left"
              >
                📚 Arts (HSC 27)
                <span className="block text-[9px] text-purple-600 font-mono">01611000004</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('captain')}
                className="p-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold border border-amber-300 transition-colors text-left"
              >
                🎖️ Captain (Rahat)
                <span className="block text-[9px] text-amber-700 font-mono">01711000001</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('staff')}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold border border-slate-300 transition-colors text-left"
              >
                🎧 Support Staff
                <span className="block text-[9px] text-slate-600 font-mono">STAFF-1002</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('admin')}
                className="p-1.5 rounded-lg bg-red-50 text-red-800 hover:bg-red-100 font-bold border border-red-200 transition-colors text-left"
              >
                🛡️ Lead Admin
                <span className="block text-[9px] text-red-600 font-mono">STAFF-1001</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
