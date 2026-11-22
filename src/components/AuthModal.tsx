import { CheckCircle2, Lock, UserCheck, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  COUNTRIES,
  CRAFT_JOBS,
  GOVERNORATE_COORDS,
  IRAQI_GOVERNORATES,
} from "../constants/locations";
import type { Craftsman, UserSession } from "../types/craftsman";

interface AuthModalProps {
  isOpen: boolean;
  initialTab: "login" | "register";
  initialRole: "customer" | "craftsman";
  onClose: () => void;
  onSuccess: (user: UserSession, craftsman?: Craftsman) => void;
}

const SAVED_PHONE_KEY = "ousta_saved_phone_v1";

export function AuthModal({
  isOpen,
  initialTab,
  initialRole,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const savedPhone = (() => {
    try {
      return localStorage.getItem(SAVED_PHONE_KEY) || "";
    } catch {
      return "";
    }
  })();

  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [role, setRole] = useState<"customer" | "craftsman">(initialRole);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setRole(initialRole);
      setError("");
    }
  }, [isOpen, initialTab, initialRole]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(savedPhone);
  const [password, setPassword] = useState("");
  const [governorate, setGovernorate] = useState<string>("بغداد");
  const [country, setCountry] = useState<string>("العراق");
  const [job, setJob] = useState<string>(CRAFT_JOBS[0]);
  const [experienceYears, setExperienceYears] = useState("5");
  const [visitFeeIQD, setVisitFeeIQD] = useState("15000");
  const [description, setDescription] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phone.trim() || !password) {
      setError("يرجى إدخال رقم الهاتف وكلمة المرور.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر تسجيل الدخول.");
        return;
      }
      if (rememberMe) {
        localStorage.setItem(SAVED_PHONE_KEY, phone.trim());
      } else {
        localStorage.removeItem(SAVED_PHONE_KEY);
      }
      onSuccess({ ...data.user, rememberMe });
      onClose();
    } catch {
      setError("حدث خطأ بالاتصال، حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || phone.trim().length < 8 || password.length < 4) {
      setError("يرجى إدخال الاسم الكامل، رقم هاتف صحيح، وكلمة مرور (٤ أحرف على الأقل).");
      return;
    }

    setLoading(true);
    try {
      const coords = GOVERNORATE_COORDS[governorate] ?? { lat: 33.3152, lng: 44.3661 };
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          password,
          role,
          governorate,
          country,
          job: role === "craftsman" ? job : undefined,
          experienceYears: role === "craftsman" ? Number(experienceYears) || 5 : undefined,
          visitFeeIQD: role === "craftsman" ? Number(visitFeeIQD) || 15000 : undefined,
          description: role === "craftsman" ? description.trim() : undefined,
          lat: coords.lat,
          lng: coords.lng,
          rememberMe,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر إنشاء الحساب.");
        return;
      }
      if (rememberMe) {
        localStorage.setItem(SAVED_PHONE_KEY, phone.trim());
      }
      onSuccess({ ...data.user, rememberMe }, data.craftsman);
      onClose();
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="حساب أوستا"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/IMG-20261121-WA1531_7ed5fe6a.jpg"
              alt="أوستا"
              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <h2 className="font-display text-lg font-bold text-slate-900">
              {tab === "login" ? "تسجيل الدخول إلى أوستا" : "إنشاء حساب جديد في أوستا"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setError("");
              }}
              className={`py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                tab === "register"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              سجّل حساباً جديداً
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError("");
              }}
              className={`py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                tab === "login"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              تسجيل الدخول
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07701234567"
                  required
                  className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594] tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#008594] rounded"
                />
                <Lock className="w-3.5 h-3.5 text-[#008594]" />
                <span>حفظ معلومات تسجيل الدخول تلقائياً للمرات القادمة</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm font-bold text-white bg-[#008594] hover:bg-[#006B78] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? "جاري التحقق..." : "دخول فوري"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role selector */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole("craftsman")}
                  className={`p-3 rounded-xl border text-right transition-colors cursor-pointer ${
                    role === "craftsman"
                      ? "border-[#EF7D1A] bg-[#EF7D1A]/5"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Wrench className="w-4 h-4 text-[#EF7D1A] mb-1" />
                  <p className="text-xs font-bold text-slate-900">حساب حرفي</p>
                  <p className="text-[11px] text-slate-500">انشر أعمالك واستقبل الطلبات</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("customer")}
                  className={`p-3 rounded-xl border text-right transition-colors cursor-pointer ${
                    role === "customer"
                      ? "border-[#008594] bg-[#008594]/5"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-[#008594] mb-1" />
                  <p className="text-xs font-bold text-slate-900">حساب زبون</p>
                  <p className="text-[11px] text-slate-500">اطلب أمهر الحرفيين بسهولة</p>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم الكامل"
                  required
                  className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="رقم الهاتف (0770...)"
                  required
                  className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594] tabular-nums"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                >
                  {IRAQI_GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      محافظة {g}
                    </option>
                  ))}
                </select>
              </div>

              {role === "craftsman" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <select
                      value={job}
                      onChange={(e) => setJob(e.target.value)}
                      className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                    >
                      {CRAFT_JOBS.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="سنوات الخبرة"
                      className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594] tabular-nums"
                    />
                    <input
                      type="number"
                      min={5000}
                      step={1000}
                      value={visitFeeIQD}
                      onChange={(e) => setVisitFeeIQD(e.target.value)}
                      placeholder="أجرة الكشفية (د.ع)"
                      className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594] tabular-nums"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="اكتب نبذة مختصرة عن خدماتك وخبرتك..."
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                  />
                </>
              )}

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أنشئ كلمة مرور (٤ أحرف على الأقل)"
                  required
                  className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#008594] rounded"
                />
                <CheckCircle2 className="w-3.5 h-3.5 text-[#008594]" />
                <span>حفظ معلومات تسجيل الدخول على هذا الجهاز</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm font-bold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {loading
                  ? "جاري التسجيل الفوري..."
                  : role === "craftsman"
                  ? "سجّل كحرفي وانشر ملفك الآن"
                  : "سجّل كزبون"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
