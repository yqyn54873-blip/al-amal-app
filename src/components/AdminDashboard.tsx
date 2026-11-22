import {
  ArrowRight,
  Briefcase,
  Check,
  ClipboardList,
  Image as ImageIcon,
  Lock,
  LogOut,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CRAFT_JOBS, IRAQI_GOVERNORATES } from "../constants/locations";
import type {
  AdminUserRecord,
  Craftsman,
  ModerationStatus,
  Order,
  OrderStatus,
  PortfolioItem,
  SponsoredAd,
} from "../types/craftsman";
import { formatIQD } from "../utils/geo";

interface AdminPortfolioRow extends PortfolioItem {
  craftsmanId: string;
  craftsmanName: string;
  craftsmanJob: string;
}

interface AdminDashboardProps {
  onNavigateHome: () => void;
}

type AdminTab = "users" | "craftsmen" | "portfolio" | "ads" | "orders";

function statusLabel(status?: ModerationStatus): string {
  if (status === "rejected") return "مرفوض";
  if (status === "pending") return "بانتظار الموافقة";
  return "موافق عليه";
}

function statusStyle(status?: ModerationStatus): string {
  if (status === "rejected") {
    return "text-red-700 bg-red-50 border-red-200";
  }
  if (status === "pending") {
    return "text-amber-800 bg-amber-50 border-amber-200";
  }
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

export function AdminDashboard({ onNavigateHome }: AdminDashboardProps) {
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [configured, setConfigured] = useState(true);
  // Keep admin token strictly in React memory (never localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string>("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>("craftsmen");
  const [loadingData, setLoadingData] = useState(false);
  const [actionError, setActionError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ModerationStatus>("all");

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<AdminPortfolioRow[]>([]);
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // New ad form state
  const [showAddAd, setShowAddAd] = useState(false);
  const [adSponsor, setAdSponsor] = useState("");
  const [adTitle, setAdTitle] = useState("");
  const [adDesc, setAdDesc] = useState("");
  const [adGov, setAdGov] = useState("بغداد وجميع المحافظات");
  const [adCode, setAdCode] = useState("OUSTA20");
  const [adCta, setAdCta] = useState("تصفح الحرفيين");
  const [adJob, setAdJob] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/status")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setConfigured(Boolean(data.configured));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCheckingStatus(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchOverview = useCallback(async (token: string) => {
    if (!token) return;
    setLoadingData(true);
    setActionError("");
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setAdminToken("");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "تعذر جلب البيانات.");
        return;
      }
      setUsers(data.users || []);
      setCraftsmen(data.craftsmen || []);
      setPortfolioItems(data.portfolioItems || []);
      setAds(data.ads || []);
      setOrders(data.orders || []);
    } catch {
      setActionError("تعذر الاتصال بالخادم.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      fetchOverview(adminToken);
    }
  }, [adminToken, fetchOverview]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (passcodeInput.trim().length < 3) {
      setAuthError("يرجى إدخال رقم سري لا يقل عن ٣ أحرف.");
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "تعذر تهيئة كلمة المرور.");
        return;
      }
      setConfigured(true);
      setAdminToken(data.token);
      setPasscodeInput("");
    } catch {
      setAuthError("تعذر الاتصال بالخادم.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!passcodeInput.trim()) {
      setAuthError("يرجى إدخال الرقم السري.");
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "الرقم السري غير صحيح.");
        return;
      }
      setAdminToken(data.token);
      setPasscodeInput("");
    } catch {
      setAuthError("تعذر الاتصال بالخادم.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (adminToken) {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      }).catch(() => {});
    }
    setAdminToken("");
    setUsers([]);
    setCraftsmen([]);
    setPortfolioItems([]);
    setAds([]);
    setOrders([]);
  };

  const authedFetch = async (url: string, options: RequestInit) => {
    setActionError("");
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401) {
      setAdminToken("");
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setActionError(data.error || "تعذر تنفيذ العملية.");
      return null;
    }
    return data;
  };

  const updateUserStatus = async (id: string, status: ModerationStatus) => {
    const data = await authedFetch(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (data) await fetchOverview(adminToken);
  };

  const deleteUser = async (id: string) => {
    const data = await authedFetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (data) await fetchOverview(adminToken);
  };

  const updateCraftsmanStatus = async (id: string, status: ModerationStatus) => {
    const data = await authedFetch(`/api/admin/craftsmen/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (data) await fetchOverview(adminToken);
  };

  const deleteCraftsman = async (id: string) => {
    const data = await authedFetch(`/api/admin/craftsmen/${id}`, {
      method: "DELETE",
    });
    if (data) await fetchOverview(adminToken);
  };

  const updatePortfolioStatus = async (
    craftsmanId: string,
    itemId: string,
    status: ModerationStatus
  ) => {
    const data = await authedFetch(
      `/api/admin/portfolio/${craftsmanId}/${itemId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    );
    if (data) await fetchOverview(adminToken);
  };

  const deletePortfolioItem = async (craftsmanId: string, itemId: string) => {
    const data = await authedFetch(
      `/api/admin/portfolio/${craftsmanId}/${itemId}`,
      { method: "DELETE" }
    );
    if (data) await fetchOverview(adminToken);
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await authedFetch("/api/admin/ads", {
      method: "POST",
      body: JSON.stringify({
        sponsorName: adSponsor,
        title: adTitle,
        description: adDesc,
        governorate: adGov,
        discountCode: adCode,
        ctaLabel: adCta,
        targetJobFilter: adJob || undefined,
      }),
    });
    if (data) {
      setAdSponsor("");
      setAdTitle("");
      setAdDesc("");
      setShowAddAd(false);
      await fetchOverview(adminToken);
    }
  };

  const updateAdStatus = async (id: string, status: ModerationStatus) => {
    const data = await authedFetch(`/api/admin/ads/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (data) await fetchOverview(adminToken);
  };

  const deleteAd = async (id: string) => {
    const data = await authedFetch(`/api/admin/ads/${id}`, { method: "DELETE" });
    if (data) await fetchOverview(adminToken);
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const data = await authedFetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (data) await fetchOverview(adminToken);
  };

  const deleteOrder = async (id: string) => {
    const data = await authedFetch(`/api/admin/orders/${id}`, { method: "DELETE" });
    if (data) await fetchOverview(adminToken);
  };

  const pendingCounts = useMemo(() => {
    return {
      users: users.filter((u) => u.status === "pending").length,
      craftsmen: craftsmen.filter((c) => c.status === "pending").length,
      portfolio: portfolioItems.filter((p) => p.status === "pending").length,
      ads: ads.filter((a) => a.status === "pending").length,
      orders: orders.filter((o) => o.status === "قيد المراجعة").length,
    };
  }, [users, craftsmen, portfolioItems, ads, orders]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (q && !`${u.name} ${u.phone} ${u.governorate}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [users, searchQuery, statusFilter]);

  const filteredCraftsmen = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return craftsmen.filter((c) => {
      const st = c.status || "approved";
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (
        q &&
        !`${c.name} ${c.job} ${c.governorate} ${c.phone}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [craftsmen, searchQuery, statusFilter]);

  const filteredPortfolio = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return portfolioItems.filter((p) => {
      const st = p.status || "approved";
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (
        q &&
        !`${p.caption} ${p.craftsmanName} ${p.governorate}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [portfolioItems, searchQuery, statusFilter]);

  const filteredAds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ads.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (q && !`${a.sponsorName} ${a.title} ${a.discountCode}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [ads, searchQuery, statusFilter]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (
        q &&
        !`${o.id} ${o.customerName} ${o.customerPhone} ${o.craftsmanName} ${o.governorate}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [orders, searchQuery]);

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <p className="text-sm font-semibold text-slate-600">
          جاري التحقق من بوابة الإدارة...
        </p>
      </div>
    );
  }

  // Gate: Setup or Login
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/IMG-20261121-WA1531_7ed5fe6a.jpg"
                alt="أوستا"
                className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="font-display text-lg font-extrabold text-slate-900">
                  {configured ? "بوابة الإدارة الخاصة" : "تهيئة لوحة تحكم الإدارة"}
                </h1>
                <p className="text-xs text-slate-500">
                  أوستا — وصول محصور بالمدير فقط
                </p>
              </div>
            </div>
            <Lock className="w-5 h-5 text-[#008594]" />
          </div>

          {!configured && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                هذه الزيارة الأولى للوحة الإدارة. أدخل الرقم السري الخاص بك الآن
                لتشفيره وحفظه ككلمة مرور معتمدة للوحة.
              </span>
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {authError}
            </div>
          )}

          <form
            onSubmit={configured ? handleLogin : handleSetup}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {configured ? "أدخل الرقم السري للإدارة" : "اختر الرقم السري للإدارة"}
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
                className="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full h-11 text-sm font-bold text-white bg-[#008594] hover:bg-[#006B78] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {authSubmitting
                ? "جاري التحقق..."
                : configured
                ? "دخول إلى لوحة التحكم"
                : "حفظ الرقم السري والدخول"}
            </button>
          </form>

          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            العودة إلى الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/assets/aistudio/IMG-20261121-WA1531_7ed5fe6a.jpg"
            alt="أوستا"
            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-lg font-extrabold text-slate-900 truncate">
              لوحة تحكم الإدارة · أوستا
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              إدارة المسجلين، الحرفيين، معرض الأعمال، الإعلانات، والطلبات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchOverview(adminToken)}
            disabled={loadingData}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            تحديث
          </button>
          <button
            type="button"
            onClick={onNavigateHome}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            عرض الموقع
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            قفل اللوحة
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Flat Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("craftsmen")}
            className={`p-4 text-right rounded-xl border transition-colors cursor-pointer ${
              activeTab === "craftsmen"
                ? "bg-white border-[#008594]"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الحرفيون</span>
              <Briefcase className="w-4 h-4 text-[#008594]" />
            </div>
            <p className="font-display text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {craftsmen.length}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5 tabular-nums">
              {pendingCounts.craftsmen} بانتظار الموافقة
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`p-4 text-right rounded-xl border transition-colors cursor-pointer ${
              activeTab === "users"
                ? "bg-white border-[#008594]"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الحسابات المسجلة</span>
              <Users className="w-4 h-4 text-[#008594]" />
            </div>
            <p className="font-display text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {users.length}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5 tabular-nums">
              {pendingCounts.users} بانتظار الموافقة
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`p-4 text-right rounded-xl border transition-colors cursor-pointer ${
              activeTab === "portfolio"
                ? "bg-white border-[#008594]"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>شغل الحرفيين</span>
              <ImageIcon className="w-4 h-4 text-[#EF7D1A]" />
            </div>
            <p className="font-display text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {portfolioItems.length}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5 tabular-nums">
              {pendingCounts.portfolio} بانتظار الموافقة
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ads")}
            className={`p-4 text-right rounded-xl border transition-colors cursor-pointer ${
              activeTab === "ads"
                ? "bg-white border-[#008594]"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الإعلانات</span>
              <Megaphone className="w-4 h-4 text-[#008594]" />
            </div>
            <p className="font-display text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {ads.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {ads.filter((a) => a.status === "approved").length} نشط حالياً
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`col-span-2 lg:col-span-1 p-4 text-right rounded-xl border transition-colors cursor-pointer ${
              activeTab === "orders"
                ? "bg-white border-[#008594]"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الطلبات</span>
              <ClipboardList className="w-4 h-4 text-[#EF7D1A]" />
            </div>
            <p className="font-display text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {orders.length}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5 tabular-nums">
              {pendingCounts.orders} قيد المراجعة
            </p>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الهاتف، المحافظة، أو الرقم..."
            className="flex-1 min-w-[220px] h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
          />

          {activeTab !== "orders" && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              {(
                [
                  { id: "all", label: "الكل" },
                  { id: "pending", label: "بانتظار الموافقة" },
                  { id: "approved", label: "موافق عليه" },
                  { id: "rejected", label: "مرفوض" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    statusFilter === opt.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === "ads" && (
            <button
              type="button"
              onClick={() => setShowAddAd((prev) => !prev)}
              className="h-10 px-4 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة إعلان جديد
            </button>
          )}
        </div>

        {actionError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {actionError}
          </div>
        )}

        {/* TAB 1: CRAFTSMEN */}
        {activeTab === "craftsmen" && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                ملفات الحرفيين ({filteredCraftsmen.length})
              </h2>
              <span className="text-xs text-slate-500">
                المرفوضون يختفون تلقائياً من الدليل العام
              </span>
            </div>

            {filteredCraftsmen.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                لا يوجد حرفيون مطابقون لهذا البحث أو الفلتر.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCraftsmen.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={c.image}
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-bold text-slate-900">
                            {c.name}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusStyle(
                              c.status
                            )}`}
                          >
                            {statusLabel(c.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          {c.job} · {c.governorate} · {c.phone} · {c.experienceYears} سنوات خبرة · الكشفية {formatIQD(c.visitFeeIQD)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCraftsmanStatus(c.id, "approved")}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCraftsmanStatus(c.id, "rejected")}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        رفض
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCraftsman(c.id)}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: REGISTERED USERS */}
        {activeTab === "users" && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                كل المسجلين ({filteredUsers.length})
              </h2>
              <span className="text-xs text-slate-500">
                حسابات الزبائن والحرفيين الجديدة
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                لا توجد حسابات مسجلة جديدة مطابقة حالياً.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-slate-900">
                          {u.name}
                        </span>
                        <span className="text-xs font-semibold text-[#008594]">
                          {u.role === "craftsman" ? "حرفي" : "زبون"}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusStyle(
                            u.status
                          )}`}
                        >
                          {statusLabel(u.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 tabular-nums">
                        الهاتف: {u.phone} · {u.governorate} · {u.country} ·{" "}
                        {u.createdAt.split("T")[0]}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateUserStatus(u.id, "approved")}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() => updateUserStatus(u.id, "rejected")}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        رفض
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(u.id)}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: PORTFOLIO WORKS */}
        {activeTab === "portfolio" && (
          <section className="space-y-4">
            {filteredPortfolio.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                لا توجد أعمال منشورة مطابقة للفلتر الحالي.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPortfolio.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-4/3 bg-slate-100">
                        <img
                          src={item.image}
                          alt={item.caption}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#008594]">
                            {item.craftsmanName} · {item.craftsmanJob}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusStyle(
                              item.status
                            )}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.caption}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {item.governorate} · {item.createdAt}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updatePortfolioStatus(item.craftsmanId, item.id, "approved")
                        }
                        className="flex-1 h-9 inline-flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updatePortfolioStatus(item.craftsmanId, item.id, "rejected")
                        }
                        className="flex-1 h-9 inline-flex items-center justify-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        رفض
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePortfolioItem(item.craftsmanId, item.id)}
                        className="h-9 px-3 inline-flex items-center justify-center text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                        aria-label="حذف العمل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 4: SPONSORED ADS */}
        {activeTab === "ads" && (
          <section className="space-y-4">
            {showAddAd && (
              <form
                onSubmit={handleCreateAd}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
              >
                <h3 className="font-display text-sm font-bold text-slate-900">
                  نشر إعلان شريك جديد
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={adSponsor}
                    onChange={(e) => setAdSponsor(e.target.value)}
                    placeholder="اسم الجهة المعلنة"
                    required
                    className="h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                  />
                  <input
                    type="text"
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="عنوان العرض الإعلاني"
                    required
                    className="h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                  />
                </div>
                <textarea
                  rows={2}
                  value={adDesc}
                  onChange={(e) => setAdDesc(e.target.value)}
                  placeholder="تفاصيل العرض..."
                  required
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <select
                    value={adGov}
                    onChange={(e) => setAdGov(e.target.value)}
                    className="h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                  >
                    <option value="بغداد وجميع المحافظات">جميع المحافظات</option>
                    {IRAQI_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={adCode}
                    onChange={(e) => setAdCode(e.target.value)}
                    placeholder="كود الخصم"
                    className="h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                  />
                  <input
                    type="text"
                    value={adCta}
                    onChange={(e) => setAdCta(e.target.value)}
                    placeholder="نص الزر"
                    className="h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                  />
                  <select
                    value={adJob}
                    onChange={(e) => setAdJob(e.target.value)}
                    className="h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                  >
                    <option value="">بدون تصفية مهنة</option>
                    {CRAFT_JOBS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAd(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#008594] hover:bg-[#006B78] rounded-lg cursor-pointer"
                  >
                    حفظ ونشر الإعلان
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredAds.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-500">
                  لا توجد إعلانات مسجلة حالياً.
                </p>
              ) : (
                filteredAds.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-slate-900">
                          {ad.title}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusStyle(
                            ad.status
                          )}`}
                        >
                          {statusLabel(ad.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {ad.sponsorName} · {ad.governorate} · كود:{" "}
                        <strong className="tabular-nums">{ad.discountCode}</strong>
                      </p>
                      <p className="text-xs text-slate-500">{ad.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateAdStatus(ad.id, "approved")}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAdStatus(ad.id, "rejected")}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        رفض
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAd(ad.id)}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 5: ORDERS */}
        {activeTab === "orders" && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                سجل الطلبات والمدفوعات ({filteredOrders.length})
              </h2>
            </div>

            {filteredOrders.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                لا توجد طلبات مسجلة حتى الآن.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-slate-900 tabular-nums">
                          {o.id} · {o.customerName} ({o.customerPhone})
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            o.status === "مرفوض"
                              ? "text-red-700 bg-red-50 border-red-200"
                              : o.status === "مكتمل" || o.status === "موافق عليه"
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-amber-800 bg-amber-50 border-amber-200"
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 tabular-nums">
                        الحرفي: <strong>{o.craftsmanName}</strong> ({o.craftsmanJob}) ·{" "}
                        {o.governorate} — {o.address}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        الإجمالي: <strong>{formatIQD(o.totalIQD)}</strong> ·{" "}
                        {o.paymentStatus} ({o.paymentReference}) · التوصيل:{" "}
                        {o.deliveryPartnerName}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(o.id, "موافق عليه")}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        موافقة
                      </button>
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(o.id, "مكتمل")}
                        className="h-9 px-3 text-xs font-semibold text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-lg cursor-pointer"
                      >
                        إكمال
                      </button>
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(o.id, "مرفوض")}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        رفض
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOrder(o.id)}
                        className="h-9 px-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
