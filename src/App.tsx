import {
  Camera,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Star,
  UserCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDashboard } from "./components/AdminDashboard";
import { AuthModal } from "./components/AuthModal";
import { CraftsmanCard } from "./components/CraftsmanCard";
import { CraftsmanFilter } from "./components/CraftsmanFilter";
import { CraftsmanProfileModal } from "./components/CraftsmanProfileModal";
import { Navbar } from "./components/Navbar";
import { OrderCheckoutModal } from "./components/OrderCheckoutModal";
import { OrdersDrawerModal } from "./components/OrdersDrawerModal";
import { PartnersAndMapSection } from "./components/PartnersAndMapSection";
import { IRAQI_GOVERNORATES, SPONSORED_OFFERS } from "./constants/locations";
import { SEED_CRAFTSMEN } from "./data/seedCraftsmen";
import type { Craftsman, Order, SponsoredAd, UserSession } from "./types/craftsman";
import { calculateDistanceKm } from "./utils/geo";

export default function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  const [craftsmen, setCraftsmen] = useState<Craftsman[]>(SEED_CRAFTSMEN);
  const [loadingCraftsmen, setLoadingCraftsmen] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ads, setAds] = useState<SponsoredAd[]>(() =>
    SPONSORED_OFFERS.map((o) => ({
      ...o,
      status: "approved",
      createdAt: "2026-11-22",
    }))
  );

  // Filter states
  const [govFilter, setGovFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  // GPS state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [sortByNearest, setSortByNearest] = useState(false);

  // Auth session (verified via server HttpOnly cookie)
  const [user, setUser] = useState<UserSession | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string>("");

  // Modals
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    tab: "login" | "register";
    role: "customer" | "craftsman";
  }>({ open: false, tab: "register", role: "craftsman" });

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [orderingCraftsman, setOrderingCraftsman] = useState<Craftsman | null>(null);
  const [defaultDeliveryPartnerId, setDefaultDeliveryPartnerId] = useState<string>("none");
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);

  const loadPublicData = useCallback(async () => {
    try {
      const [craftsRes, ordersRes, adsRes, meRes] = await Promise.all([
        fetch("/api/craftsmen"),
        fetch("/api/orders"),
        fetch("/api/ads"),
        fetch("/api/auth/me"),
      ]);
      if (craftsRes.ok) {
        const data = await craftsRes.json();
        if (Array.isArray(data.craftsmen)) {
          setCraftsmen(data.craftsmen);
        }
      }
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        if (Array.isArray(oData.orders)) {
          setOrders(oData.orders);
        }
      }
      if (adsRes.ok) {
        const aData = await adsRes.json();
        if (Array.isArray(aData.ads)) {
          setAds(aData.ads);
        }
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.user) {
          setUser({ ...meData.user, rememberMe: true });
        }
      }
    } catch {
      // Keep fallback data gracefully
    } finally {
      setLoadingCraftsmen(false);
    }
  }, []);

  useEffect(() => {
    if (!showAdmin) {
      loadPublicData();
    }
  }, [showAdmin, loadPublicData]);

  const navigateHomeFromAdmin = () => {
    setShowAdmin(false);
    loadPublicData();
  };

  const handleAuthSuccess = (session: UserSession, newCraftsman?: Craftsman) => {
    setUser(session);
    if (newCraftsman) {
      setNoticeMessage(
        "تم تسجيل حسابك كحرفي بنجاح! ملفك الآن بانتظار موافقة الإدارة ليظهر في الدليل العام."
      );
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    }).catch(() => {});
    setUser(null);
  };

  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      setUserCoords({ lat: 33.3152, lng: 44.3661 });
      setSortByNearest(true);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: Math.round(pos.coords.latitude * 100000) / 100000,
          lng: Math.round(pos.coords.longitude * 100000) / 100000,
        });
        setSortByNearest(true);
        setGpsLoading(false);
      },
      () => {
        setUserCoords({ lat: 33.3152, lng: 44.3661 });
        setSortByNearest(true);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleFilterChange = (
    gov: string,
    job: string,
    search: string,
    country?: string
  ) => {
    setGovFilter(gov);
    setJobFilter(job);
    setSearchFilter(search);
    if (typeof country === "string") setCountryFilter(country);
  };

  const handleResetFilters = () => {
    setGovFilter("");
    setJobFilter("");
    setSearchFilter("");
    setCountryFilter("");
    setSortByNearest(false);
  };

  const filteredCraftsmen = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    const list = craftsmen.filter((c) => {
      if (govFilter && c.governorate !== govFilter) return false;
      if (jobFilter && c.job !== jobFilter) return false;
      if (countryFilter && c.country !== countryFilter) return false;
      if (q) {
        const hay = `${c.name} ${c.job} ${c.governorate} ${c.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortByNearest && userCoords) {
      return [...list].sort(
        (a, b) =>
          calculateDistanceKm(userCoords.lat, userCoords.lng, a.lat, a.lng) -
          calculateDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng)
      );
    }

    return list;
  }, [craftsmen, govFilter, jobFilter, countryFilter, searchFilter, sortByNearest, userCoords]);

  const allPortfolioWorks = useMemo(() => {
    return craftsmen.flatMap((c) =>
      c.portfolio.map((p) => ({
        ...p,
        craftsmanId: c.id,
        craftsmanName: c.name,
        craftsmanJob: c.job,
      }))
    );
  }, [craftsmen]);

  const selectedProfile = useMemo(
    () => craftsmen.find((c) => c.id === selectedProfileId) || null,
    [craftsmen, selectedProfileId]
  );

  const handleSubmitReview = async (
    craftsmanId: string,
    stars: number,
    comment: string,
    authorName: string,
    orderId?: string
  ) => {
    const res = await fetch(`/api/craftsmen/${craftsmanId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars, comment, authorName }),
    });
    if (res.ok) {
      const data = await res.json();
      setCraftsmen((prev) =>
        prev.map((c) => (c.id === craftsmanId ? data.craftsman : c))
      );
    } else {
      setCraftsmen((prev) =>
        prev.map((c) => {
          if (c.id !== craftsmanId) return c;
          const nextCount = c.reviewsCount + 1;
          const nextRating = (c.rating * c.reviewsCount + stars) / nextCount;
          return {
            ...c,
            rating: Math.round(nextRating * 100) / 100,
            reviewsCount: nextCount,
            reviews: [
              {
                id: `rev-${Date.now()}`,
                authorName,
                stars,
                comment,
                createdAt: new Date().toISOString().split("T")[0],
              },
              ...c.reviews,
            ],
          };
        })
      );
    }

    if (orderId) {
      await fetch(`/api/orders/${orderId}/rated`, { method: "PATCH" }).catch(() => {});
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, rated: true, status: "مكتمل" } : o
        )
      );
    }
  };

  const handlePublishPortfolio = async (
    craftsmanId: string,
    image: string,
    caption: string,
    governorate: string
  ) => {
    const res = await fetch(`/api/craftsmen/${craftsmanId}/portfolio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, caption, governorate }),
    });
    if (res.ok) {
      const data = await res.json();
      setCraftsmen((prev) =>
        prev.map((c) => (c.id === craftsmanId ? data.craftsman : c))
      );
      if (data.pendingReview) {
        setNoticeMessage(
          "تم استلام صورة العمل بنجاح، وستظهر في المعرض العام فور موافقة الإدارة."
        );
      }
    }
  };

  const handleOpenPublishWork = () => {
    if (user?.craftsmanId) {
      setSelectedProfileId(user.craftsmanId);
    } else if (craftsmen[0]) {
      setSelectedProfileId(craftsmen[0].id);
    }
  };

  const handleSelectDeliveryForOrder = (partnerId: string) => {
    setDefaultDeliveryPartnerId(partnerId);
    const target = filteredCraftsmen[0] || craftsmen[0];
    if (target) setOrderingCraftsman(target);
  };

  if (showAdmin) {
    return <AdminDashboard onNavigateHome={navigateHomeFromAdmin} />;
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar
        user={user}
        ordersCount={orders.length}
        onOpenAuth={(tab, role) =>
          setAuthModal({ open: true, tab, role: role || "customer" })
        }
        onOpenOrders={() => setOrdersModalOpen(true)}
        onOpenPublishWork={handleOpenPublishWork}
        onLogout={handleLogout}
        onSecretAdminTrigger={() => setShowAdmin(true)}
      />

      {noticeMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-xs sm:text-sm text-emerald-900">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              {noticeMessage}
            </span>
            <button
              type="button"
              onClick={() => setNoticeMessage("")}
              aria-label="إغلاق الإشعار"
              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="space-y-3">
                <p className="text-xs sm:text-sm font-bold text-[#008594]">
                  أوستا العراق · جميع المحافظات الثماني عشرة
                </p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight text-balance">
                  ابحث عن أمهر الحرفيين في محافظتك واحجز بضغطة واحدة
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  منصة أوستا تجمع السباكين، الكهربائيين، النجارين، وفنيي التكييف
                  المعتمدين في بغداد والبصرة وأربيل وكافة محافظات العراق، مع
                  تقييمات حقيقية، توصيل عبر بلي وطلباتي وكريم، وملاحة مباشرة عبر ويز.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#craftsmen-directory"
                  className="px-6 py-3 text-sm font-bold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] rounded-xl transition-colors whitespace-nowrap"
                >
                  تصفح الحرفيين الآن
                </a>

                {!user ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAuthModal({ open: true, tab: "login", role: "customer" })
                    }
                    className="px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                  >
                    تسجيل الدخول أو حساب جديد
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenPublishWork}
                    className="px-5 py-3 text-sm font-semibold text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-xl transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    انشر صور أعمالك
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 tabular-nums">
                <div>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
                    {IRAQI_GOVERNORATES.length} محافظة
                  </p>
                  <p className="text-xs text-slate-500">تغطية شاملة للعراق</p>
                </div>
                <div>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
                    {craftsmen.length}+ حرفي
                  </p>
                  <p className="text-xs text-slate-500">مهنيون بتقييمات موثقة</p>
                </div>
                <div>
                  <p className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
                    4 شركاء
                  </p>
                  <p className="text-xs text-slate-500">بلي · طلباتي · كريم · ويز</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] sm:min-h-[360px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                <img
                  src="/src/assets/images/hero_ousta_craftsman_1795291447382.jpg"
                  alt="حرفي أوستا أثناء تنفيذ أعمال الصيانة والتركيب"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/35 to-transparent p-5 text-white flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display font-bold text-sm sm:text-base">
                      تواصل مباشر عبر واتساب أو اطلب الآن بالدفع الإلكتروني
                    </p>
                    <p className="text-xs text-slate-200 mt-0.5">
                      زين كاش · كي كارد · الدفع عند الإنجاز
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-[#EF7D1A]" />
                    حرفيون موثوقون
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Craftsman Search, Filter & Directory */}
        <section
          id="craftsmen-directory"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
                دليل الحرفيين والخدمات
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                اختر المحافظة والمهنة أو ابحث بالاسم للوصول السريع للحرفي المناسب.
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-700 tabular-nums">
              عرض {filteredCraftsmen.length} من أصل {craftsmen.length} حرفي
            </p>
          </div>

          <CraftsmanFilter
            governorate={govFilter}
            job={jobFilter}
            search={searchFilter}
            country={countryFilter}
            gpsActive={sortByNearest && Boolean(userCoords)}
            gpsLoading={gpsLoading}
            onChange={handleFilterChange}
            onRequestGps={handleRequestGps}
            onReset={handleResetFilters}
          />

          {loadingCraftsmen ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-64 rounded-xl bg-white border border-slate-200 p-5 animate-pulse"
                />
              ))}
            </div>
          ) : filteredCraftsmen.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <p className="font-display text-lg font-bold text-slate-900">
                لا يوجد حرفيون مطابقون لخيارات البحث الحالية
              </p>
              <p className="text-sm text-slate-600">
                جرّب تغيير المحافظة أو المهنة، أو سجّل كأول حرفي في هذه المنطقة.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  عرض جميع الحرفيين
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAuthModal({ open: true, tab: "register", role: "craftsman" })
                  }
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] rounded-lg cursor-pointer"
                >
                  سجّل كحرفي الآن
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCraftsmen.map((c) => {
                const dist = userCoords
                  ? calculateDistanceKm(userCoords.lat, userCoords.lng, c.lat, c.lng)
                  : null;
                return (
                  <CraftsmanCard
                    key={c.id}
                    c={c}
                    distanceKm={dist}
                    onSelectProfile={(craftsman) => setSelectedProfileId(craftsman.id)}
                    onOrderNow={(craftsman) => {
                      setDefaultDeliveryPartnerId("none");
                      setOrderingCraftsman(craftsman);
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Dedicated Work Showcase Section */}
        <section
          id="portfolio-showcase"
          className="bg-white border-y border-slate-200 py-14"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#008594]">
                  معرض أعمال الحرفيين
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  صور الأعمال المنجزة في المحافظات
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  مساحة مخصصة لكل حرفي لنشر صور أعماله الحقيقية وإثبات جودة التنفيذ للزبائن.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenPublishWork}
                className="px-4 py-2.5 inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#008594] hover:bg-[#006B78] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Camera className="w-4 h-4" />
                انشر صورة عمل جديد
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {allPortfolioWorks.slice(0, 8).map((work) => (
                <button
                  key={work.id}
                  type="button"
                  onClick={() => setSelectedProfileId(work.craftsmanId)}
                  className="text-right border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:bg-white hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="aspect-4/3 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={work.image}
                      alt={work.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {work.caption}
                    </p>
                    <p className="text-xs text-slate-500 pt-1">
                      {work.craftsmanName} · {work.craftsmanJob} · {work.governorate}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Partners (Baly, Talabaty, Careem, Talabat Delivery) + Real Waze GPS + Dynamic Approved Ads */}
        <PartnersAndMapSection
          ads={ads}
          userCoords={userCoords}
          gpsLoading={gpsLoading}
          selectedGov={govFilter}
          onRequestGps={handleRequestGps}
          onSelectDeliveryForOrder={handleSelectDeliveryForOrder}
          onApplySponsoredFilter={(job) => {
            if (job) setJobFilter(job);
            document
              .getElementById("craftsmen-directory")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* Payment Trust Strip */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#008594] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  دفع إلكتروني حقيقي وآمن
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  ادفع عبر زين كاش (ZainCash)، بطاقات كي كارد وماستر كارد، أو نقداً
                  عند إتمام الخدمة.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-[#EF7D1A] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  تقييمات حقيقية بعد كل طلب
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  يقيّم الزبون الحرفي من ١ إلى ٥ نجوم بعد إتمام الطلب ليظهر التقييم
                  مباشرة في ملف الحرفي.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-[#008594] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  تسجيل فوري وحفظ الجلسة
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  تسجيل سريع بدون تأخير مع حفظ جلسة الدخول بشكل آمن على الخادم.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer (zero admin links) */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/IMG-20261121-WA1531_7ed5fe6a.jpg"
              alt="شعار أوستا"
              className="w-7 h-7 rounded-md object-cover border border-slate-200"
              referrerPolicy="no-referrer"
            />
            <span className="font-display font-bold text-slate-800 text-sm">
              أوستا (Ousta)
            </span>
            <span>· جميع الحقوق محفوظة © ٢٠٢٦</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a href="#craftsmen-directory" className="hover:text-slate-900">
              الحرفيون
            </a>
            <a href="#portfolio-showcase" className="hover:text-slate-900">
              معرض الأعمال
            </a>
            <a href="#partners-navigation" className="hover:text-slate-900">
              شركاء التوصيل والملاحة
            </a>
            <button
              type="button"
              onClick={() =>
                setAuthModal({ open: true, tab: "login", role: "customer" })
              }
              className="hover:text-slate-900 cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CraftsmanProfileModal
        craftsman={selectedProfile}
        user={user}
        distanceKm={
          selectedProfile && userCoords
            ? calculateDistanceKm(
                userCoords.lat,
                userCoords.lng,
                selectedProfile.lat,
                selectedProfile.lng
              )
            : null
        }
        onClose={() => setSelectedProfileId(null)}
        onOrderNow={(c) => {
          setSelectedProfileId(null);
          setDefaultDeliveryPartnerId("none");
          setOrderingCraftsman(c);
        }}
        onSubmitReview={async (craftsmanId, stars, comment, authorName) => {
          await handleSubmitReview(craftsmanId, stars, comment, authorName);
        }}
        onPublishPortfolio={handlePublishPortfolio}
      />

      <OrderCheckoutModal
        craftsman={orderingCraftsman}
        user={user}
        userCoords={userCoords}
        defaultDeliveryPartnerId={defaultDeliveryPartnerId}
        onClose={() => setOrderingCraftsman(null)}
        onOrderCreated={(newOrder) => setOrders((prev) => [newOrder, ...prev])}
        onSubmitReviewAfterOrder={handleSubmitReview}
      />

      <AuthModal
        isOpen={authModal.open}
        initialTab={authModal.tab}
        initialRole={authModal.role}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        onSuccess={handleAuthSuccess}
      />

      <OrdersDrawerModal
        isOpen={ordersModalOpen}
        orders={orders}
        onClose={() => setOrdersModalOpen(false)}
        onSubmitReview={handleSubmitReview}
      />
    </div>
  );
}
