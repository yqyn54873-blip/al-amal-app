import {
  Images,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useState } from "react";
import type { Craftsman } from "../types/craftsman";
import { buildWazeNavigateUrl, formatIQD, formatIraqWhatsApp } from "../utils/geo";

interface CraftsmanCardProps {
  c: Craftsman;
  distanceKm?: number | null;
  onSelectProfile: (craftsman: Craftsman) => void;
  onOrderNow: (craftsman: Craftsman) => void;
}

export function CraftsmanCard({
  c,
  distanceKm,
  onSelectProfile,
  onOrderNow,
}: CraftsmanCardProps) {
  const [imgError, setImgError] = useState(false);

  const whatsappLink = formatIraqWhatsApp(
    c.phone,
    `مرحباً ${c.name}، شفت بروفايلك بتطبيق أوستا (Ousta) وحاب أطلب خدمتك في ${c.governorate}.`
  );
  const wazeUrl = buildWazeNavigateUrl(c.lat, c.lng);

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Top profile & image section */}
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => onSelectProfile(c)}
            className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008594]"
          >
            {!imgError && c.image ? (
              <img
                src={c.image}
                alt={c.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#008594]/10 text-[#008594] font-display font-bold text-xl">
                {c.name.slice(0, 1)}
              </div>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectProfile(c)}
                className="text-right font-display text-lg font-bold text-slate-900 hover:text-[#008594] transition-colors truncate cursor-pointer"
              >
                {c.name}
              </button>
              {c.verified && (
                <ShieldCheck
                  className="w-4 h-4 text-[#008594] shrink-0"
                  aria-label="حرفي موثق"
                />
              )}
            </div>

            {/* Clean unboxed metadata with typographic separators */}
            <p className="text-sm font-medium text-[#008594] mt-0.5 truncate">
              {c.job} · {c.governorate}
              {c.country && c.country !== "العراق" ? ` (${c.country})` : ""}
            </p>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 mt-1.5 tabular-nums">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                <Star className="w-3.5 h-3.5 fill-[#EF7D1A] text-[#EF7D1A]" />
                {c.rating.toFixed(1)}
              </span>
              <span>({c.reviewsCount} تقييم)</span>
              <span aria-hidden="true">·</span>
              <span>{c.experienceYears} سنوات خبرة</span>
              {typeof distanceKm === "number" && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#008594] font-semibold">
                    يبعد {distanceKm} كم
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
          {c.description}
        </p>

        {/* Work showcase preview strip + fee info */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
          <button
            type="button"
            onClick={() => onSelectProfile(c)}
            className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-[#008594] transition-colors cursor-pointer"
          >
            <Images className="w-3.5 h-3.5 text-[#008594]" />
            <span>معرض الأعمال ({c.portfolio.length}) والتقييمات</span>
          </button>

          <span className="font-semibold text-slate-900 tabular-nums">
            الكشفية: {formatIQD(c.visitFeeIQD || 15000)}
          </span>
        </div>
      </div>

      {/* Action buttons — every button is wired and functional */}
      <div className="px-5 pb-5 pt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onOrderNow(c)}
          className="flex-1 min-w-[115px] h-10 px-4 text-sm font-semibold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          اطلب الآن
        </button>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          title="مراسلة عبر واتساب"
        >
          <MessageCircle className="w-4 h-4" />
          واتساب
        </a>

        <a
          href={`tel:${c.phone}`}
          className="h-10 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          title={`اتصال مباشر: ${c.phone}`}
        >
          <Phone className="w-4 h-4" />
          اتصال
        </a>

        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-10 px-2.5 inline-flex items-center justify-center text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-lg transition-colors shrink-0"
          title="فتح المسار عبر ويز (Waze)"
          aria-label="الملاحة عبر ويز"
        >
          <Navigation className="w-4 h-4" />
        </a>
      </div>
    </article>
  );
}
