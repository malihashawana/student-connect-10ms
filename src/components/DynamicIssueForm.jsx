import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  UploadCloud, 
  File, 
  X, 
  AlertCircle, 
  GraduationCap, 
  FileEdit, 
  Smartphone, 
  HelpCircle, 
  Calendar, 
  Clock, 
  Layers, 
  BookOpen,
  Send
} from 'lucide-react';
import { translations } from '../translations';
import { api } from '../api';

const GROUP_SUBJECT_MAP = {
  'Science': [
    'Physics 1st Paper', 'Physics 2nd Paper', 'Chemistry 1st Paper', 'Chemistry 2nd Paper',
    'Higher Math 1st Paper', 'Higher Math 2nd Paper', 'Biology 1st Paper', 'Biology 2nd Paper',
    'Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT'
  ],
  'Commerce': [
    'Accounting 1st Paper', 'Accounting 2nd Paper', 'Finance 1st Paper', 'Finance 2nd Paper',
    'Management 1st Paper', 'Management 2nd Paper', 'Marketing 1st Paper', 'Marketing 2nd Paper',
    'Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT'
  ],
  'Arts': [
    'Economics 1st Paper', 'Economics 2nd Paper', 'Civics 1st Paper', 'Civics 2nd Paper',
    'Geography 1st Paper', 'Geography 2nd Paper',
    'Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper', 'ICT'
  ]
};

const ALL_SUBJECTS = Array.from(new Set([
  ...GROUP_SUBJECT_MAP['Science'],
  ...GROUP_SUBJECT_MAP['Commerce'],
  ...GROUP_SUBJECT_MAP['Arts']
]));

export default function DynamicIssueForm({ user, onCancel, onSuccess, lang }) {
  const t = translations[lang] || translations.en;

  // Step state: 1 (Category) -> 2 (Group & Subject) -> 3 (Specific Details) -> 4 (Review & Submit)
  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields
  const [category, setCategory] = useState(''); // 'Class' | 'Exam' | 'App/Website' | 'Others'
  
  // Program is automatically locked to the student's enrolled course (no manual HSC 27 / HSC 28 selection!)
  const program = user?.program || 'HSC 28';

  // Group selection: Science / Commerce / Arts as requested
  const [group, setGroup] = useState(
    user?.department === 'Business Studies' ? 'Commerce' : 
    user?.department === 'Humanities' ? 'Arts' : 'Science'
  );

  const [subject, setSubject] = useState(GROUP_SUBJECT_MAP['Science'][0]);

  // Catalog items loaded from sheet for Column G dropdowns
  const [catalogItems, setCatalogItems] = useState([]);

  // Step 3A: Class Issue Specifics
  const [classType, setClassType] = useState('Live Class'); // 'Live Class' | 'Recorded Class' | 'Archive' | 'Others'
  const [classDate, setClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [classSessionTitle, setClassSessionTitle] = useState('');
  const [customClassSession, setCustomClassSession] = useState('');
  const [classProblemType, setClassProblemType] = useState('Audio/Video lag or freeze');

  // Step 3B: Exam Issue Specifics (Daily / Monthly / CQ / Others + Date or N/A + Column G titles)
  const [examType, setExamType] = useState('Daily Exam'); // 'Daily Exam' | 'Monthly Exam' | 'CQ Exam' | 'Others'
  const [customExamType, setCustomExamType] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDateNA, setIsDateNA] = useState(false);
  const [examTitleFromG, setExamTitleFromG] = useState('');
  const [customExamTitle, setCustomExamTitle] = useState('');
  const [examProblemType, setExamProblemType] = useState('Submission error / 0 marks bug');

  // Step 3C: App / Website Specifics
  const [appPlatform, setAppPlatform] = useState('Android App');
  const [appVersion, setAppVersion] = useState('v4.8.2');
  const [appProblemType, setAppProblemType] = useState('Video player 403 / error playing stream');
  const [deviceInfo, setDeviceInfo] = useState('');

  // Step 3D: Others Specifics
  const [otherSubtype, setOtherSubtype] = useState('Lecture Sheet Download Link');
  const [otherDetails, setOtherDetails] = useState('');

  // Final Step: Description & Attachments
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Update subject list when group changes
  useEffect(() => {
    const list = GROUP_SUBJECT_MAP[group] || ALL_SUBJECTS;
    if (!list.includes(subject)) {
      setSubject(list[0]);
    }
  }, [group]);

  // Fetch Sheet Column G catalog titles whenever subject changes
  useEffect(() => {
    async function fetchCatalogForSubject() {
      try {
        const res = await api.getCatalog({ subject });
        setCatalogItems(res.items || []);
        if (res.items && res.items.length > 0) {
          setClassSessionTitle(res.items[0].title);
          setExamTitleFromG(res.items[0].title);
        } else {
          setClassSessionTitle('');
          setExamTitleFromG('');
        }
      } catch (err) {
        console.error('Failed to load catalog for subject:', err);
      }
    }
    fetchCatalogForSubject();
  }, [subject]);

  // Auto-compose suggested Title
  useEffect(() => {
    let suggested = '';
    if (category === 'Class') {
      const sess = classSessionTitle === 'OTHER' ? customClassSession : classSessionTitle;
      suggested = `[${classType}] ${subject} - ${sess || 'Class Issue'}`;
    } else if (category === 'Exam') {
      const eType = examType === 'Others' ? (customExamType || 'Other Exam') : examType;
      const eTitle = examTitleFromG === 'OTHER' ? customExamTitle : examTitleFromG;
      const dStr = isDateNA ? 'Date: N/A' : examDate;
      suggested = `[${eType}] ${subject} (${dStr}) - ${eTitle || examProblemType}`;
    } else if (category === 'App/Website') {
      suggested = `[${appPlatform}] ${appProblemType}`;
    } else if (category === 'Others') {
      suggested = `[Other] ${subject} - ${otherSubtype}`;
    }
    setTitle(suggested);
  }, [
    category, classType, classSessionTitle, customClassSession,
    examType, customExamType, examTitleFromG, customExamTitle, isDateNA, examDate,
    appPlatform, appProblemType, subject, otherSubtype
  ]);

  // File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds maximum 10MB limit.');
      return;
    }

    setUploadingFile(true);
    try {
      const res = await api.uploadFile(file);
      setAttachments(prev => [...prev, {
        name: res.name,
        url: res.url,
        size: res.size,
        type: res.mimetype
      }]);
    } catch (err) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage(lang === 'bn' ? 'সমস্যার বিস্তারিত বিবরণ আবশ্যক।' : 'Detailed description is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    // Context metadata packaging
    let context_details = {};
    if (category === 'Class') {
      context_details = {
        class_type: classType,
        class_date: classType === 'Live Class' ? classDate : (classDate || 'N/A'),
        session_title: classSessionTitle === 'OTHER' ? customClassSession : classSessionTitle,
        problem_specific: classProblemType
      };
    } else if (category === 'Exam') {
      context_details = {
        exam_type: examType === 'Others' ? customExamType : examType,
        exam_date: isDateNA ? 'N/A' : examDate,
        is_date_na: isDateNA,
        exam_title: examTitleFromG === 'OTHER' ? customExamTitle : examTitleFromG,
        problem_type: examProblemType
      };
    } else if (category === 'App/Website') {
      context_details = {
        app_platform: appPlatform,
        app_version: appVersion,
        problem_type: appProblemType,
        device_info: deviceInfo
      };
    } else {
      context_details = {
        other_subtype: otherSubtype,
        other_details: otherDetails
      };
    }

    try {
      const deptNormalized = group === 'Commerce' ? 'Business Studies' : group === 'Arts' ? 'Humanities' : 'Science';

      const payload = {
        category,
        program, // Automatically inherited from student's enrolled course!
        department: deptNormalized,
        subject,
        title: title || `${category} Issue - ${subject}`,
        description: description.trim(),
        priority,
        context_details,
        attachments
      };

      const res = await api.createTicket(payload);
      onSuccess(res.ticket);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="btn-secondary text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'bn' ? 'ড্যাশবোর্ডে ফিরে যাও' : 'Back to Dashboard'}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <span>{lang === 'bn' ? `ধাপ ${currentStep} / ৪` : `Step ${currentStep} of 4`}</span>
        </div>
      </div>

      {/* Progress Steps (4 Steps, clean & simple) */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#E5E7EB] shadow-xs mb-6">
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: lang === 'bn' ? 'ক্যাটাগরি' : 'Category' },
            { step: 2, label: lang === 'bn' ? 'গ্রুপ ও বিষয়' : 'Group & Subject' },
            { step: 3, label: lang === 'bn' ? 'সমস্যার বিবরণ' : 'Issue Context' },
            { step: 4, label: lang === 'bn' ? 'রিভিউ ও সাবমিট' : 'Review & Submit' }
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-1">
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === item.step
                    ? 'bg-[#E8001D] text-white ring-2 ring-red-100'
                    : currentStep > item.step
                    ? 'bg-[#1CAB55] text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {currentStep > item.step ? <Check className="w-3.5 h-3.5" /> : item.step}
              </div>
              <span className={`text-[10px] font-bold text-center line-clamp-1 ${
                currentStep === item.step ? 'text-[#111827]' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Card Body */}
      <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-6 sm:p-8">
        
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ================= STEP 1: CATEGORY SELECTION ================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center max-w-md mx-auto space-y-1">
              <h2 className="text-xl font-extrabold text-[#111827]">
                {lang === 'bn' ? 'সমস্যার ক্যাটাগরি বেছে নাও' : 'Select Issue Category'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'যে বিষয়ে সমস্যা হচ্ছে তা সিলেক্ট করো' : 'Choose the category that best describes your problem'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {[
                {
                  id: 'Class',
                  title: lang === 'bn' ? 'ক্লাস সংক্রান্ত সমস্যা' : 'Class Issue',
                  desc: lang === 'bn' ? 'লাইভ ক্লাসে অডিও/ভিডিও ল্যাগ, স্লাইড সমস্যা বা রেকর্ডেড ক্লাস' : 'Live stream freeze, audio lag, missing slides or recording playback',
                  icon: <GraduationCap className="w-6 h-6 text-[#E8001D]" />
                },
                {
                  id: 'Exam',
                  title: lang === 'bn' ? 'পরীক্ষা সংক্রান্ত সমস্যা' : 'Exam Issue',
                  desc: lang === 'bn' ? 'ডেইলি এক্সাম, মান্থলি বা সিকিউ এক্সাম ও মার্কস সমস্যা' : 'Daily exam, monthly exam, CQ upload, submission error or marks bug',
                  icon: <FileEdit className="w-6 h-6 text-[#274FE3]" />
                },
                {
                  id: 'App/Website',
                  title: lang === 'bn' ? 'অ্যাপ ও ওয়েবসাইট' : 'App & Website',
                  desc: lang === 'bn' ? 'ভিডিও প্লেয়ার ৪MD এরর, লগইন, ওটিপি বা অ্যাপ ক্র্যাশ' : 'Video player 403 error, buffering, login/OTP or crash bugs',
                  icon: <Smartphone className="w-6 h-6 text-[#EA580C]" />
                },
                {
                  id: 'Others',
                  title: lang === 'bn' ? 'অন্যান্য সমস্যা' : 'Other Issues',
                  desc: lang === 'bn' ? 'লেকচার শিট ডাউনলোড বা সাধারণ জিজ্ঞাসা' : 'Lecture sheet downloads, discussion group access, or course inquiries',
                  icon: <HelpCircle className="w-6 h-6 text-purple-600" />
                }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    category === item.id 
                      ? 'border-[#E8001D] bg-[#FFF5F6] ring-2 ring-[#E8001D]/15' 
                      : 'border-[#E5E7EB] hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      {item.icon}
                    </div>
                    {category === item.id && (
                      <span className="w-5 h-5 rounded-full bg-[#E8001D] text-white flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827] mb-0.5">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={!category}
                onClick={() => setCurrentStep(2)}
                className="btn-primary text-xs"
              >
                <span>{lang === 'bn' ? 'পরবর্তী ধাপ' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: GROUP & SUBJECT (SCIENCE / COMMERCE / ARTS) ================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center max-w-md mx-auto space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-bold text-slate-700 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-[#E8001D]" />
                <span>{program} Course (Auto-enrolled)</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#111827]">
                {lang === 'bn' ? 'বিভাগ (Group) ও বিষয় নির্বাচন করো' : 'Select Academic Group & Subject'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'তোমার গ্রুপ অনুযায়ী বিষয় সিলেক্ট করো' : 'Choose your group (Science, Commerce, or Arts) and the related subject'}
              </p>
            </div>

            <div className="max-w-xl mx-auto space-y-5 pt-2">
              
              {/* Group selection: Science / Commerce / Arts using DESIGN.md Section 8.4 Group Tabs */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-2">
                  {lang === 'bn' ? 'গ্রুপ নির্বাচন করো (Academic Group) *' : 'Academic Group *'}
                </label>
                <div className="flex gap-2.5">
                  {[
                    { id: 'Science', label: 'Science (বিজ্ঞান)' },
                    { id: 'Commerce', label: 'Commerce (কমার্স)' },
                    { id: 'Arts', label: 'Arts (মানবিক)' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGroup(g.id)}
                      className={`group-tab ${group === g.id ? 'active' : ''}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject selector */}
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-2">
                  {lang === 'bn' ? 'বিষয় (Subject) *' : 'Subject *'}
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input-ten font-semibold bg-white"
                >
                  <optgroup label={`${group} Subjects`}>
                    {(GROUP_SUBJECT_MAP[group] || []).map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </optgroup>
                  <optgroup label="All Other Subjects">
                    {ALL_SUBJECTS.filter(s => !(GROUP_SUBJECT_MAP[group] || []).includes(s)).map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  💡 You can report an issue for any subject across batches.
                </p>
              </div>

            </div>

            <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn-secondary text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{lang === 'bn' ? 'পূর্ববর্তী' : 'Back'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="btn-primary text-xs"
              >
                <span>{lang === 'bn' ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CONDITIONAL ISSUE FLOW ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            
            {/* 3A: CLASS ISSUE SPECIFIC FLOW */}
            {category === 'Class' && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8001D]">
                    {lang === 'bn' ? 'ক্লাস সংক্রান্ত বিবরণ' : 'Class Details'}
                  </span>
                  <h3 className="text-base font-bold text-[#111827] mt-0.5">
                    {lang === 'bn' ? 'ক্লাসের ধরন ও তারিখ নিশ্চিত করো' : 'Class Type & Date'}
                  </h3>
                </div>

                {/* Class Type: Live / Recorded / Archive / Others */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-2">
                    {lang === 'bn' ? 'কোন ক্লাসের সমস্যা? (Class Type) *' : 'Class Type *'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'Live Class', label: 'Live Class' },
                      { id: 'Recorded Class', label: 'Recorded Class' },
                      { id: 'Archive', label: 'Archive Class' },
                      { id: 'Others', label: 'Others' }
                    ].map((ct) => (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => setClassType(ct.id)}
                        className={`group-tab ${classType === ct.id ? 'active' : ''}`}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* If Live Class: Class Date picker */}
                {classType === 'Live Class' && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-[#E5E7EB] space-y-1.5">
                    <label className="block text-xs font-bold text-[#111827] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#E8001D]" />
                      <span>{lang === 'bn' ? 'কবের ক্লাস? (Class Date) *' : 'Class Date *'}</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={classDate}
                      onChange={(e) => setClassDate(e.target.value)}
                      className="input-ten sm:w-60 font-semibold"
                    />
                  </div>
                )}

                {/* Class Session Title from Google Sheet Column G */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#111827]">
                      {lang === 'bn' ? 'ক্লাসের সেশন / টপিক (Sheet Column G)' : 'Session / Topic (from Schedule Sheet)'}
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {catalogItems.length} sessions listed
                    </span>
                  </div>

                  <select
                    value={classSessionTitle}
                    onChange={(e) => setClassSessionTitle(e.target.value)}
                    className="input-ten bg-white"
                  >
                    {catalogItems.map((item) => (
                      <option key={item.id} value={item.title}>
                        {item.date ? `${item.date.split(',')[0]} - ` : ''}{item.title} ({item.chapter})
                      </option>
                    ))}
                    <option value="OTHER">-- Not Listed / Custom Topic --</option>
                  </select>

                  {classSessionTitle === 'OTHER' && (
                    <input
                      type="text"
                      value={customClassSession}
                      onChange={(e) => setCustomClassSession(e.target.value)}
                      placeholder="Type custom class or topic name..."
                      className="input-ten mt-2"
                    />
                  )}
                </div>

                {/* Problem type */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">
                    {lang === 'bn' ? 'নির্দিষ্ট সমস্যার ধরন' : 'Specific Problem Type'}
                  </label>
                  <select
                    value={classProblemType}
                    onChange={(e) => setClassProblemType(e.target.value)}
                    className="input-ten bg-white"
                  >
                    <option value="Audio/Video lag or freeze">Audio-video sync lag / stream freeze</option>
                    <option value="Instructor live link broken">Cannot join live class / broken link</option>
                    <option value="Lecture slide not uploaded">Lecture slides or PDF handnote missing</option>
                    <option value="Recorded backup video missing">Recorded backup not available after live</option>
                    <option value="Other Class Issue">Other class issue</option>
                  </select>
                </div>
              </div>
            )}

            {/* 3B: EXAM ISSUE SPECIFIC FLOW */}
            {category === 'Exam' && (
              <div className="space-y-5">
                <div className="border-b border-[#E5E7EB] pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#274FE3]">
                    {lang === 'bn' ? 'পরীক্ষা সংক্রান্ত বিবরণ' : 'Exam Details'}
                  </span>
                  <h3 className="text-base font-bold text-[#111827] mt-0.5">
                    {lang === 'bn' ? 'এক্সামের ধরন, তারিখ ও টাইটেল' : 'Exam Type, Date & Title'}
                  </h3>
                </div>

                {/* Exam Type: Daily / Monthly / CQ / Others */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-2">
                    {lang === 'bn' ? 'এক্সামের ধরন (Exam Type) *' : 'Exam Type *'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'Daily Exam', label: 'Daily Exam' },
                      { id: 'Monthly Exam', label: 'Monthly Exam' },
                      { id: 'CQ Exam', label: 'CQ Exam' },
                      { id: 'Others', label: 'Others' }
                    ].map((et) => (
                      <button
                        key={et.id}
                        type="button"
                        onClick={() => setExamType(et.id)}
                        className={`group-tab ${examType === et.id ? 'active' : ''}`}
                      >
                        {et.label}
                      </button>
                    ))}
                  </div>

                  {examType === 'Others' && (
                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={customExamType}
                        onChange={(e) => setCustomExamType(e.target.value)}
                        placeholder="Type custom exam type (e.g. Model Test, Paper Final)..."
                        className="input-ten"
                      />
                    </div>
                  )}
                </div>

                {/* Exam Date picker with N/A button */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-[#E5E7EB] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#274FE3]" />
                      <span>{lang === 'bn' ? 'কোন তারিখের এক্সাম? (Exam Date)' : 'Exam Date'}</span>
                    </label>

                    {/* N/A Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsDateNA(!isDateNA)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        isDateNA 
                          ? 'bg-[#E8001D] text-white shadow-xs' 
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isDateNA ? '✓ Date Unknown (N/A)' : 'Don\'t know date? Click N/A'}
                    </button>
                  </div>

                  {!isDateNA ? (
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="input-ten sm:w-60 font-semibold"
                    />
                  ) : (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                      Date: N/A (Date unknown / not applicable)
                    </div>
                  )}
                </div>

                {/* Exam Title from Google Sheet Column G */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#111827]">
                      {lang === 'bn' ? 'এক্সামের টাইটেল (Sheet Column G)' : 'Exam Title (from Sheet Column G)'}
                    </label>
                    <span className="text-[11px] text-[#274FE3] font-semibold">
                      {examType === 'Daily Exam' ? '📅 Date + Title' : 'Title'}
                    </span>
                  </div>

                  <select
                    value={examTitleFromG}
                    onChange={(e) => setExamTitleFromG(e.target.value)}
                    className="input-ten bg-white"
                  >
                    {catalogItems.map((item) => (
                      <option key={item.id} value={item.title}>
                        {examType === 'Daily Exam' && item.date ? `[${item.date.split(',')[0]}] ` : ''}
                        {item.title} ({item.chapter})
                      </option>
                    ))}
                    <option value="OTHER">-- Not Listed / Custom Exam Title --</option>
                  </select>

                  {examTitleFromG === 'OTHER' && (
                    <input
                      type="text"
                      value={customExamTitle}
                      onChange={(e) => setCustomExamTitle(e.target.value)}
                      placeholder="Type custom exam title..."
                      className="input-ten mt-2"
                    />
                  )}
                </div>

                {/* Problem type */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">
                    {lang === 'bn' ? 'নির্দিষ্ট সমস্যার ধরন' : 'Exam Problem Type'}
                  </label>
                  <select
                    value={examProblemType}
                    onChange={(e) => setExamProblemType(e.target.value)}
                    className="input-ten bg-white"
                  >
                    <option value="Submission error / 0 marks bug">Automatic 0 marks / submission glitch</option>
                    <option value="Question / Option error">Question paper error or incorrect options</option>
                    <option value="Timer bug / abrupt end">Timer ended before time / exam forced closed</option>
                    <option value="CQ answer script upload error">CQ script / photo upload failed</option>
                    <option value="Result & Solution not visible">Result or solution explanation not visible</option>
                  </select>
                </div>
              </div>
            )}

            {/* 3C: APP & WEBSITE FLOW */}
            {category === 'App/Website' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
                    App & Web Details
                  </span>
                  <h3 className="text-base font-bold text-[#111827] mt-0.5">
                    Platform & Device Information
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Android App', 'iOS App', 'Web Desktop', 'Web Mobile'].map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setAppPlatform(plat)}
                      className={`group-tab ${appPlatform === plat ? 'active' : ''}`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-[#111827] mb-1">
                      App Version / Browser
                    </label>
                    <input
                      type="text"
                      value={appVersion}
                      onChange={(e) => setAppVersion(e.target.value)}
                      placeholder="e.g. v4.8.2, Chrome 124"
                      className="input-ten"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111827] mb-1">
                      Device Model & OS
                    </label>
                    <input
                      type="text"
                      value={deviceInfo}
                      onChange={(e) => setDeviceInfo(e.target.value)}
                      placeholder="e.g. Samsung Galaxy A54, Android 14"
                      className="input-ten"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Problem Type
                  </label>
                  <select
                    value={appProblemType}
                    onChange={(e) => setAppProblemType(e.target.value)}
                    className="input-ten bg-white"
                  >
                    <option value="Video player 403 / error playing stream">Video player 403 error / stream not loading</option>
                    <option value="Login / OTP code not receiving">OTP verification code not received</option>
                    <option value="Continuous buffering / black screen">Buffering freeze / black screen</option>
                    <option value="Purchased course missing from library">Enrolled course missing from library</option>
                    <option value="App crashing during class">App suddenly crashes during class</option>
                  </select>
                </div>
              </div>
            )}

            {/* 3D: OTHERS FLOW */}
            {category === 'Others' && (
              <div className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                    Other Inquiries
                  </span>
                  <h3 className="text-base font-bold text-[#111827] mt-0.5">
                    Select Subtype
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1.5">
                    Issue Subtype
                  </label>
                  <select
                    value={otherSubtype}
                    onChange={(e) => setOtherSubtype(e.target.value)}
                    className="input-ten bg-white"
                  >
                    <option value="Lecture Sheet Download Link">Lecture sheet / note download link broken</option>
                    <option value="Telegram / Facebook Discussion Group">Discussion group joining issue</option>
                    <option value="Course Routine Confusion">Schedule or batch routine clarification</option>
                    <option value="General Inquiry">General support inquiry</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn-secondary text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{lang === 'bn' ? 'পূর্ববর্তী' : 'Back'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="btn-primary text-xs"
              >
                <span>{lang === 'bn' ? 'রিভিউ ও বর্ণনা' : 'Review & Submit'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* ================= STEP 4: REVIEW & SUBMIT ================= */}
        {currentStep === 4 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="border-b border-[#E5E7EB] pb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1CAB55]">
                {lang === 'bn' ? 'চূড়ান্ত ধাপ' : 'Final Step'}
              </span>
              <h3 className="text-base font-bold text-[#111827] mt-0.5">
                {lang === 'bn' ? 'সমস্যার পূর্ণ বিবরণ দাও ও টিকেট সাবমিট করো' : 'Describe the Issue & Submit Ticket'}
              </h3>
            </div>

            {/* Summary Preview Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-[#E5E7EB] space-y-2 text-xs">
              <span className="font-bold text-[#111827] block text-[11px] uppercase tracking-wider">
                Summary of Selections:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Category</span>
                  <span className="font-bold text-[#111827]">{category}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Course (Program)</span>
                  <span className="font-bold text-[#E8001D]">{program}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Group & Subject</span>
                  <span className="font-bold text-[#274FE3] truncate block">{group} • {subject}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Context</span>
                  <span className="font-bold text-[#111827]">
                    {category === 'Class' ? classType : category === 'Exam' ? `${examType} (${isDateNA ? 'N/A' : examDate})` : appPlatform}
                  </span>
                </div>
              </div>
            </div>

            {/* Issue Title */}
            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                {lang === 'bn' ? 'টিকেটের শিরোনাম (Title)' : 'Ticket Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-ten font-semibold"
              />
            </div>

            {/* Description (Required) */}
            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1">
                {lang === 'bn' ? 'সমস্যার বিস্তারিত বিবরণ (Description) *' : 'Detailed Description *'}
              </label>
              <textarea
                required
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === 'bn' ? 'সমস্যাটি ঠিক কীভাবে ঘটেছে বিস্তারিত লেখো...' : 'Please describe what happened, what you saw on screen, and any steps to reproduce...'}
                className="input-ten"
              />
            </div>

            {/* Attachment upload */}
            <div>
              <label className="block text-xs font-bold text-[#111827] mb-1.5 flex items-center justify-between">
                <span>{lang === 'bn' ? 'স্ক্রিনশট বা ফাইল সংযুক্ত করো (ঐচ্ছিক)' : 'Attach Screenshot or File (Optional)'}</span>
                <span className="text-[11px] text-slate-400">Max 10MB (PNG, JPG, PDF)</span>
              </label>

              <label className="border-2 border-dashed border-[#E5E7EB] hover:border-[#1CAB55] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-bold text-[#111827]">Click to select a file</span>
                <span className="text-[10px] text-slate-400">Screenshots help our team fix issues faster</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.docx,.txt"
                />
              </label>

              {uploadingFile && (
                <div className="text-xs text-blue-600 font-semibold mt-2 animate-pulse">
                  Uploading file...
                </div>
              )}

              {attachments.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-100 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="font-semibold text-[#111827] truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400">({file.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1 rounded text-slate-400 hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Bar with Green Action Button (.btn-primary) */}
            <div className="flex items-center justify-between pt-6 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="btn-secondary text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{lang === 'bn' ? 'পূর্ববর্তী' : 'Back'}</span>
              </button>

              <button
                type="submit"
                disabled={submitting || uploadingFile}
                className="btn-primary text-sm shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : (lang === 'bn' ? 'টিকেট সাবমিট করো' : 'Submit Ticket')}</span>
              </button>
            </div>

          </form>
        )}

      </div>

    </div>
  );
}
