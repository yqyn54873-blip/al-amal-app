import {
  Compass,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Navigation,
  Truck,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  DELIVERY_PARTNERS,
  GOVERNORATE_COORDS,
  IRAQI_GOVERNORATES,
} from "../constants/locations";
import type { SponsoredAd } from "../types/craftsman";
import { buildWazeEmbedUrl, buildWazeNavigateUrl, formatIQD } from "../utils/geo";

interface PartnersAndMapSectionProps {
  ads: SponsoredAd[];
  userCoords: { lat: number; lng: number } | null;
  gpsLoading: boolean;
  selectedGov: string;
  onRequestGps: () => void;
  onSelectDeliveryForOrder: (partnerId: string) => void;
  onApplySponsoredFilter: (jobFilter?: string) => void;
}

export function PartnersAndMapSection({
  ads,
  userCoords,
  gpsLoading,
  selectedGov,
  onRequestGps,
  onSelectDeliveryForOrder,
  onApplySponsoredFilter,
}: PartnersAndMapSectionProps) {
  const [mapGov, setMapGov] = useState<string>(selectedGov || "بغداد");
  const [adDismissed, setAdDismissed] = useState(false);
  const [activeOfferIdx, setActiveOfferIdx] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  const activeCoords =
    userCoords || GOVERNORATE_COORDS[mapGov] || { lat: 33.3152, lng: 44.3661 };
  const wazeEmbed = buildWazeEmbedUrl(activeCoords.lat, activeCoords.lng);
  const wazeLaunch = buildWazeNavigateUrl(activeCoords.lat, activeCoords.lng);

  const currentOffer = ads.length > 0 ? ads[activeOfferIdx % ads.length] : null;

  const handleCopyCode = async () => {
    if (!currentOffer) return;
    try {
      await navigator.clipboard.writeText(currentOffer.discountCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback no-op
    }
  };

  return (
    <section
      id="partners-navigation"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12"
    >
      {/* Non-intrusive, contextual, dismissible sponsored card */}
      {!adDismissed && currentOffer && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#008594]">إعلان شريك معتمد</span>
              <span aria-hidden="true">·</span>
              <span>{currentOffer.sponsorName}</span>
              <span aria-hidden="true">·</span>
              <span>{currentOffer.governorate}</span>
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
              {currentOffer.title}
            </h3>
            <p className="text-sm text-slate-600">{currentOffer.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyCode}
              className="h-10 px-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer tabular-nums"
              title="نسخ كود الخصم"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  تم النسخ
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#008594]" />
                  كود: {currentOffer.discountCode}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onApplySponsoredFilter(currentOffer.targetJobFilter)}
              className="h-10 px-4 text-xs font-semibold text-white bg-[#008594] hover:bg-[#006B78] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {currentOffer.ctaLabel}
            </button>

            {ads.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setActiveOfferIdx((prev) => (prev + 1) % ads.length)
                }
                className="h-10 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                عرض آخر
              </button>
            )}

            <button
              type="button"
              onClick={() => setAdDismissed(true)}
              aria-label="إخفاء الإعلان"
              title="إخفاء الإعلان"
              className="h-10 w-10 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Real GPS + Waze Partnership & Delivery Partners Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Waze Real GPS Navigation Card */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#008594]">
                  شراكة الملاحة المباشرة · Waze GPS
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                  تحديد الموقع الحقيقي والملاحة عبر ويز
                </h2>
              </div>

              <button
                type="button"
                onClick={onRequestGps}
                disabled={gpsLoading}
                className="h-10 px-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#008594] hover:bg-[#006B78] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-4 h-4" />
                {gpsLoading ? "جاري التحديد..." : "تفعيل موقعي (GPS)"}
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              فعّل نظام تحديد المواقع الحقيقي (GPS) لحساب المسافة الفعلية بين منزلك
              وأقرب حرفي، أو افتح مسار الوصول مباشرة عبر تطبيق ويز (Waze).
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-slate-700 tabular-nums">
                <MapPin className="w-4 h-4 text-[#EF7D1A] shrink-0" />
                {userCoords ? (
                  <span>
                    موقعك الحالي: <strong>{userCoords.lat}</strong>,{" "}
                    <strong>{userCoords.lng}</strong>
                  </span>
                ) : (
                  <span>اختر المحافظة للمعاينة أو فعّل GPS لموقعك الدقيق</span>
                )}
              </div>

              <select
                value={mapGov}
                onChange={(e) => setMapGov(e.target.value)}
                aria-label="اختر المحافظة على الخريطة"
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#008594]"
              >
                {IRAQI_GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-60">
              <iframe
                title="خريطة ويز الحية في العراق"
                src={wazeEmbed}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                تغطية حية لطرق جميع محافظات العراق الـ ١٨
              </span>
              <a
                href={wazeLaunch}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-lg transition-colors whitespace-nowrap"
              >
                <Navigation className="w-3.5 h-3.5" />
                فتح في تطبيق ويز (Waze)
              </a>
            </div>
          </div>
        </div>

        {/* Delivery & Mobility Partners (Baly, Talabaty, Careem, Talabat Delivery) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-[#EF7D1A]">
              شراكات النقل والتوصيل في العراق
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
              شركات التوصيل المتعاقد معها
            </h2>
            <p className="text-sm text-slate-600">
              اطلب توصيل القطع الاحتياطية أو تنقل الحرفي عبر بلي، طلباتي، كريم، أو
              طلبات توصيل مباشرة من داخل صفحة الطلب.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {DELIVERY_PARTNERS.map((partner) => (
              <div
                key={partner.id}
                className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#008594]" />
                      {partner.name}
                    </span>
                    <span className="text-xs font-bold text-[#008594] tabular-nums">
                      {formatIQD(partner.baseFeeIQD)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">
                    {partner.serviceType}
                  </p>
                  <p className="text-[11px] text-slate-500 tabular-nums">
                    الوقت المتوقع: {partner.etaMinutes} · {partner.coverage}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectDeliveryForOrder(partner.id)}
                    className="flex-1 h-9 px-3 text-xs font-semibold text-white bg-[#008594] hover:bg-[#006B78] rounded-lg transition-colors cursor-pointer"
                  >
                    اطلب مع {partner.name}
                  </button>
                  <a
                    href={partner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-2.5 inline-flex items-center justify-center text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                    title={`زيارة موقع ${partner.name}`}
                    aria-label={`فتح ${partner.name}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
