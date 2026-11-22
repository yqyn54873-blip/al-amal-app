import {
  Camera,
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { IRAQI_GOVERNORATES } from "../constants/locations";
import type { Craftsman, UserSession } from "../types/craftsman";
import {
  buildWazeEmbedUrl,
  buildWazeNavigateUrl,
  formatIQD,
  formatIraqWhatsApp,
} from "../utils/geo";
import { RatingForm } from "./RatingForm";

interface CraftsmanProfileModalProps {
  craftsman: Craftsman | null;
  user: UserSession | null;
  distanceKm?: number | null;
  onClose: () => void;
  onOrderNow: (craftsman: Craftsman) => void;
  onSubmitReview: (
    craftsmanId: string,
    stars: number,
    comment: string,
    authorName: string
  ) => Promise<void>;
  onPublishPortfolio: (
    craftsmanId: string,
    image: string,
    caption: string,
    governorate: string
  ) => Promise<void>;
}

const PRESET_SHOWCASE_IMAGES = [
  {
    label: "تشطيب داخلي وأرضيات",
    url: "/src/assets/images/work_showcase_interior_1795291447123.jpg",
  },
  {
    label: "سباكة وتكييف حديث",
    url: "/src/assets/images/work_showcase_plumbing_ac_1795291447410.jpg",
  },
];

export function CraftsmanProfileModal({
  craftsman,
  user,
  distanceKm,
  onClose,
  onOrderNow,
  onSubmitReview,
  onPublishPortfolio,
}: CraftsmanProfileModalProps) {
  const [showPublisher, setShowPublisher] = useState(false);
  const [workImage, setWorkImage] = useState<string>(PRESET_SHOWCASE_IMAGES[0].url);
  const [workCaption, setWorkCaption] = useState("");
  const [workGov, setWorkGov] = useState(craftsman?.governorate || "بغداد");
  const [publishing, setPublishing] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const [fileError, setFileError] = useState("");

  if (!craftsman) return null;

  const whatsappLink = formatIraqWhatsApp(
    craftsman.phone,
    `مرحباً ${craftsman.name}، شفت بروفايلك ومعرض أعمالك بتطبيق أوستا وحاب أطلب خدمتك.`
  );
  const wazeUrl = buildWazeNavigateUrl(craftsman.lat, craftsman.lng);
  const wazeEmbedUrl = buildWazeEmbedUrl(craftsman.lat, craftsman.lng);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("يرجى اختيار ملف صورة صالح (JPG أو PNG).");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setFileError("حجم الصورة كبير، يرجى اختيار صورة أقل من ٣ ميجابايت.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setWorkImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workCaption.trim() || publishing) return;
    setPublishing(true);
    try {
      await onPublishPortfolio(craftsman.id, workImage, workCaption.trim(), workGov);
      setWorkCaption("");
      setShowPublisher(false);
      setPublishDone(true);
      setTimeout(() => setPublishDone(false), 3500);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`ملف الحرفي ${craftsman.name}`}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={craftsman.image}
              alt={craftsman.name}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-lg font-bold text-slate-900 truncate">
                  {craftsman.name}
                </h2>
                {craftsman.verified && (
                  <ShieldCheck className="w-4 h-4 text-[#008594] shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 truncate">
                {craftsman.job} · {craftsman.governorate} · {craftsman.country}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Summary & primary actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700 tabular-nums">
                <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                  <Star className="w-4 h-4 fill-[#EF7D1A] text-[#EF7D1A]" />
                  {craftsman.rating.toFixed(1)} ({craftsman.reviewsCount} تقييم)
                </span>
                <span className="text-slate-300">|</span>
                <span>{craftsman.experienceYears} سنوات خبرة</span>
                <span className="text-slate-300">|</span>
                <span>الهاتف: {craftsman.phone}</span>
                {typeof distanceKm === "number" && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="text-[#008594] font-semibold">
                      يبعد {distanceKm} كم عن موقعك
                    </span>
                  </>
                )}
              </div>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {craftsman.description}
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => onOrderNow(craftsman)}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] rounded-lg transition-colors cursor-pointer"
                >
                  اطلب الآن ({formatIQD(craftsman.visitFeeIQD || 15000)})
                </button>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  واتساب
                </a>
                <a
                  href={`tel:${craftsman.phone}`}
                  className="px-4 py-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  اتصال مباشر
                </a>
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-lg transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  ملاحة ويز (Waze)
                </a>
              </div>
            </div>

            {/* Live Waze Map Card */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col">
              <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#008594]" />
                  موقع العمل ({craftsman.governorate})
                </span>
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#008594] hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  توجيه ويز
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <iframe
                title={`خريطة ويز لموقع ${craftsman.name}`}
                src={wazeEmbedUrl}
                className="w-full h-44 border-0"
                loading="lazy"
              />
            </div>
          </div>

          {/* Dedicated Work Portfolio Section ("مكان مخصص لنشر عمل الشخص صور") */}
          <section className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  معرض الأعمال المنجزة ({craftsman.portfolio.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  صور حقيقية لأعمال الحرفي المنشورة في محافظة {craftsman.governorate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPublisher((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-lg transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                {showPublisher ? "إلغاء النشر" : "نشر صورة عمل جديدة"}
              </button>
            </div>

            {publishDone && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                تم نشر صورة العمل في معرض الحرفي بنجاح!
              </div>
            )}

            {showPublisher && (
              <form
                onSubmit={handlePublishSubmit}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      ارفع صورة العمل من جهازك أو اختر نموذجاً
                    </label>
                    <label className="flex items-center justify-center gap-2 h-11 px-3 bg-white border border-dashed border-slate-300 hover:border-[#008594] rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-[#008594]" />
                      <span>اختر صورة من الجهاز (JPG / PNG)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>
                    {fileError && (
                      <p className="text-xs text-red-600">{fileError}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {PRESET_SHOWCASE_IMAGES.map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setWorkImage(preset.url)}
                          className={`text-[11px] px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                            workImage === preset.url
                              ? "border-[#008594] bg-[#008594]/10 text-[#008594] font-semibold"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      وصف العمل والمحافظة
                    </label>
                    <input
                      type="text"
                      value={workCaption}
                      onChange={(e) => setWorkCaption(e.target.value)}
                      placeholder="مثال: تأسيس كهرباء شقة سكنية في المنصور"
                      required
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                    />
                    <select
                      value={workGov}
                      onChange={(e) => setWorkGov(e.target.value)}
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594]"
                    >
                      {IRAQI_GOVERNORATES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={workImage}
                      alt="معاينة العمل"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                    />
                    <span className="text-xs text-slate-500">معاينة الصورة قبل النشر</span>
                  </div>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#008594] hover:bg-[#006B78] rounded-lg transition-colors cursor-pointer"
                  >
                    {publishing ? "جاري النشر..." : "نشر في المعرض"}
                  </button>
                </div>
              </form>
            )}

            {craftsman.portfolio.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {craftsman.portfolio.map((item) => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                  >
                    <div className="aspect-4/3 bg-slate-100">
                      <img
                        src={item.image}
                        alt={item.caption}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-slate-900 line-clamp-2">
                        {item.caption}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        {item.governorate} · {item.createdAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 bg-slate-50 rounded-xl text-center border border-slate-200">
                لا توجد صور أعمال منشورة بعد. يمكنك إضافة أول صورة عمل من الزر أعلاه.
              </p>
            )}
          </section>

          {/* Reviews & RatingForm */}
          <section className="space-y-4 pt-6 border-t border-slate-200">
            <h3 className="font-display text-lg font-bold text-slate-900">
              آراء وتقييمات الزبائن ({craftsman.reviewsCount})
            </h3>

            <RatingForm
              defaultAuthorName={user?.name || ""}
              onSubmit={async (stars, comment, authorName) => {
                await onSubmitReview(craftsman.id, stars, comment, authorName);
              }}
            />

            {craftsman.reviews.length > 0 ? (
              <div className="space-y-3">
                {craftsman.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 border border-slate-200 rounded-xl bg-white space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {rev.authorName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-[#EF7D1A] text-[#EF7D1A]" />
                        {rev.stars} / 5
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{rev.comment}</p>
                    <p className="text-xs text-slate-400 tabular-nums">{rev.createdAt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                كن أول من يقيّم {craftsman.name} بعد تجربة الخدمة.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
