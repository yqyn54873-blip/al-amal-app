import { LogOut, MapPin, PlusCircle, UserCheck } from "lucide-react";
import { useRef } from "react";
import type { UserSession } from "../types/craftsman";

interface NavbarProps {
  user: UserSession | null;
  ordersCount: number;
  onOpenAuth: (defaultTab: "login" | "register", defaultRole?: "customer" | "craftsman") => void;
  onOpenOrders: () => void;
  onOpenPublishWork: () => void;
  onLogout: () => void;
  onSecretAdminTrigger?: () => void;
}

export function Navbar({
  user,
  ordersCount,
  onOpenAuth,
  onOpenOrders,
  onOpenPublishWork,
  onLogout,
  onSecretAdminTrigger,
}: NavbarProps) {
  const clickTimestampsRef = useRef<number[]>([]);

  const handleBrandClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const now = Date.now();
    clickTimestampsRef.current = clickTimestampsRef.current.filter(
      (ts) => now - ts <= 3000
    );
    clickTimestampsRef.current.push(now);

    if (clickTimestampsRef.current.length >= 5) {
      clickTimestampsRef.current = [];
      onSecretAdminTrigger?.();
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark + Logo */}
        <a
          href="#top"
          onClick={handleBrandClick}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008594] rounded-lg"
        >
          <img
            src="/assets/aistudio/IMG-20261121-WA1531_7ed5fe6a.jpg"
            alt="شعار أوستا"
            draggable={false}
            className="w-9 h-9 rounded-lg object-cover border border-slate-200"
            referrerPolicy="no-referrer"
          />
          <span className="font-display text-xl font-extrabold tracking-tight text-slate-900">
            أوستا
          </span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a
            href="#craftsmen-directory"
            className="hover:text-[#008594] transition-colors whitespace-nowrap shrink-0"
          >
            الحرفيون
          </a>
          <a
            href="#portfolio-showcase"
            className="hover:text-[#008594] transition-colors whitespace-nowrap shrink-0"
          >
            معرض الأعمال
          </a>
          <a
            href="#partners-navigation"
            className="hover:text-[#008594] transition-colors whitespace-nowrap shrink-0"
          >
            التوصيل والملاحة
          </a>
          <button
            type="button"
            onClick={onOpenOrders}
            className="hover:text-[#008594] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            طلباتي ({ordersCount})
          </button>
        </nav>

        {/* Zone 3: Primary action / Account control */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2.5">
              {user.role === "craftsman" && (
                <button
                  type="button"
                  onClick={onOpenPublishWork}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  انشر عملك
                </button>
              )}
              <button
                type="button"
                onClick={onOpenOrders}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="معلومات الحساب المحفوظة"
              >
                <UserCheck className="w-4 h-4 text-[#008594]" />
                <span className="max-w-[110px] truncate">{user.name}</span>
                <span className="hidden sm:inline text-slate-400">·</span>
                <span className="hidden sm:inline text-slate-500 inline-flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {user.governorate}
                </span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth("register", "craftsman")}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              سجّل كحرفي
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
