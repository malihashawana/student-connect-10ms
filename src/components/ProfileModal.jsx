import React, { useState } from 'react';
import { X, User, Phone, BookOpen, Layers, School, MapPin, Mail, Lock, Check, Save } from 'lucide-react';
import { translations } from '../translations';
import { api } from '../api';

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser, lang }) {
  if (!isOpen || !user) return null;
  const t = translations[lang] || translations.bn;

  const [fullName, setFullName] = useState(user.full_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [college, setCollege] = useState(user.college || '');
  const [district, setDistrict] = useState(user.district || '');
  const [address, setAddress] = useState(user.address || '');
  const [contactPhone, setContactPhone] = useState(user.contact_phone || user.phone || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const res = await api.updateProfile({
        full_name: fullName,
        email,
        college,
        district,
        address,
        contact_phone: contactPhone
      });

      onUpdateUser(res.user);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#DA291C] to-red-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{user.full_name}</h3>
              <p className="text-xs text-slate-500 font-medium">
                {user.role === 'admin' ? 'সিস্টেম এডমিনিস্ট্রেটর' : user.role === 'staff' ? 'সাপোর্ট স্পেশালিস্ট' : user.role === 'captain' ? 'ব্যাচ ক্যাপ্টেন' : 'শিক্ষার্থী'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>প্রোফাইল সফলভাবে আপডেট করা হয়েছে!</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Locked Identity Section (PRD Section 3.2 & 13) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                নিরাপদ প্রাতিষ্ঠানিক তথ্য (লক করা)
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                পরিবর্তনের জন্য এডমিন যোগাযোগ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              {user.tms_id && (
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">TMS Transaction ID</span>
                  <span className="font-bold text-slate-800 font-mono">{user.tms_id}</span>
                </div>
              )}
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">নিবন্ধিত ফোন নম্বর</span>
                <span className="font-bold text-slate-800 font-mono">{user.phone}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">অনলাইন ব্যাচ / প্রোগ্রাম</span>
                <span className="font-bold text-red-700">{user.program || 'HSC 28'}</span>
              </div>
              {user.department && user.department !== 'ALL' && (
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">বিভাগ / গ্রুপ</span>
                  <span className="font-bold text-blue-700">{user.department}</span>
                </div>
              )}
              {user.class_level && (
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">ক্লাস ও বর্ষ</span>
                  <span className="font-bold text-slate-800">{user.class_level} ({user.academic_year || '2026'})</span>
                </div>
              )}
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              ব্যক্তিগত ও যোগাযোগ তথ্য
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পূর্ণ নাম (Full Name) *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ইমেইল এড্রেস (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C]"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিকল্প যোগাযোগ নম্বর
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C]"
                  placeholder="01xxxxxxxxx"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  কলেজ / শিক্ষা প্রতিষ্ঠান
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C]"
                  placeholder="Dhaka College, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  জেলা (District)
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C]"
                  placeholder="Dhaka, Chittagong, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ঠিকানা (Address)
              </label>
              <textarea
                rows="2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DA291C]/30 focus:border-[#DA291C]"
                placeholder="House, Road, Area..."
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-[#DA291C] hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'সংরক্ষণ হচ্ছে...' : t.save_changes}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
