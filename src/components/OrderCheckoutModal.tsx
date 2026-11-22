import {
  CheckCircle2,
  Compass,
  CreditCard,
  ExternalLink,
  Navigation,
  ShieldCheck,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  DELIVERY_PARTNERS,
  GOVERNORATE_COORDS,
  IRAQI_GOVERNORATES,
} from "../constants/locations";
import type {
  Craftsman,
  Order,
  PaymentMethodId,
  UserSession,
} from "../types/craftsman";
import { buildWazeNavigateUrl, formatIQD, validateLuhnCard } from "../utils/geo";
import { RatingForm } from "./RatingForm";

interface OrderCheckoutModalProps {
  craftsman: Craftsman | null;
  user: UserSession | null;
  userCoords: { lat: number; lng: number } | null;
  defaultDeliveryPartnerId?: string;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
  onSubmitReviewAfterOrder: (
    craftsmanId: string,
    stars: number,
    comment: string,
    authorName: string,
    orderId: string
  ) => Promise<void>;
}

export function OrderCheckoutModal({
  craftsman,
  user,
  userCoords,
  defaultDeliveryPartnerId = "none",
  onClose,
  onOrderCreated,
  onSubmitReviewAfterOrder,
}: OrderCheckoutModalProps) {
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [governorate, setGovernorate] = useState(
    craftsman?.governorate || user?.governorate || "بغداد"
  );
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryPartnerId, setDeliveryPartnerId] = useState<string>(
    defaultDeliveryPartnerId
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("zaincash");

  useEffect(() => {
    if (craftsman) {
      setGovernorate(craftsman.governorate || user?.governorate || "بغداد");
      setDeliveryPartnerId(defaultDeliveryPartnerId);
      setConfirmedOrder(null);
      setRatedDone(false);
      setErrorMsg("");
      if (user) {
        setCustomerName(user.name);
        setCustomerPhone(user.phone);
        setZainCashPhone(user.phone);
      }
    }
  }, [craftsman, defaultDeliveryPartnerId, user]);

  // ZainCash fields
  const [zainCashPhone, setZainCashPhone] = useState(user?.phone || "");
  const [zainCashOtp, setZainCashOtp] = useState("");

  // QiCard / MasterCard fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Live GPS coordinates
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    userCoords
  );
  const [gpsLoading, setGpsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [ratedDone, setRatedDone] = useState(false);

  if (!craftsman) return null;

  const selectedPartner = DELIVERY_PARTNERS.find((p) => p.id === deliveryPartnerId);
  const visitFeeIQD = craftsman.visitFeeIQD || 15000;
  const deliveryFeeIQD = selectedPartner ? selectedPartner.baseFeeIQD : 0;
  const totalIQD = visitFeeIQD + deliveryFeeIQD;

  const handleDetectGps = () => {
    setErrorMsg("");
    if (!navigator.geolocation) {
      const fallback = GOVERNORATE_COORDS[governorate] || { lat: 33.3152, lng: 44.3661 };
      setCoords(fallback);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Math.round(pos.coords.latitude * 100000) / 100000,
          lng: Math.round(pos.coords.longitude * 100000) / 100000,
        });
        setGpsLoading(false);
      },
      () => {
        const fallback = GOVERNORATE_COORDS[governorate] || {
          lat: 33.3152,
          lng: 44.3661,
        };
        setCoords(fallback);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      setErrorMsg("يرجى ملء الاسم ورقم الهاتف والعنوان بدقة.");
      return;
    }

    if (paymentMethod === "zaincash") {
      if (zainCashPhone.replace(/\D/g, "").length < 10 || zainCashOtp.trim().length < 4) {
        setErrorMsg("يرجى إدخال رقم محفظة زين كاش ورمز التحقق (٤ أرقام) لإتمام الدفع.");
        return;
      }
    }

    if (paymentMethod === "qicard") {
      if (!validateLuhnCard(cardNumber) || !cardExpiry.trim() || cardCvv.trim().length < 3) {
        setErrorMsg("يرجى إدخال رقم بطاقة كي كارد / ماستر كارد صحيح وتاريخ الانتهاء ورمز الأمان.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craftsmanId: craftsman.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          governorate,
          address: address.trim(),
          notes: notes.trim(),
          deliveryPartnerId,
          paymentMethod,
          zainCashPhone,
          zainCashOtp,
          cardNumber,
          cardExpiry,
          cardCvv,
          customerLat: coords?.lat,
          customerLng: coords?.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر إتمام الطلب، يرجى المحاولة مرة أخرى.");
        return;
      }
      setConfirmedOrder(data.order);
      onOrderCreated(data.order);
    } catch {
      setErrorMsg("حدث خطأ في الاتصال بالخادم. يرجى المحاولة مجدداً.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`طلب خدمة ${craftsman.name}`}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {confirmedOrder ? "تم تأكيد طلبك بنجاح" : `اطلب الآن: ${craftsman.name}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {craftsman.job} · {craftsman.governorate}
            </p>
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

        {confirmedOrder ? (
          <div className="p-6 space-y-6">
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-800">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <p className="font-display font-bold text-base">
                    رقم الطلب: {confirmedOrder.id}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {confirmedOrder.paymentStatus} · مرجع الدفع: {confirmedOrder.paymentReference}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200/70 text-xs text-emerald-900">
                <div>
                  <span className="text-emerald-700 block">الحرفي:</span>
                  <span className="font-semibold">
                    {confirmedOrder.craftsmanName} ({confirmedOrder.craftsmanJob})
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 block">شريك التوصيل:</span>
                  <span className="font-semibold">{confirmedOrder.deliveryPartnerName}</span>
                </div>
                <div>
                  <span className="text-emerald-700 block">العنوان:</span>
                  <span className="font-semibold">
                    {confirmedOrder.governorate} — {confirmedOrder.address}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 block">المبلغ الإجمالي:</span>
                  <span className="font-bold tabular-nums">
                    {formatIQD(confirmedOrder.totalIQD)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={buildWazeNavigateUrl(craftsman.lat, craftsman.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#008594] bg-[#008594]/10 hover:bg-[#008594]/15 rounded-lg transition-colors"
              >
                <Navigation className="w-4 h-4" />
                تتبع المسار عبر ويز (Waze)
              </a>
              {selectedPartner && (
                <a
                  href={selectedPartner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  فتح تطبيق {selectedPartner.name}
                </a>
              )}
            </div>

            {/* Post-order Customer Star Rating */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                تقييم الحرفي بعد الطلب
              </h3>
              {ratedDone ? (
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#008594]">
                  شكراً لك! تم احتساب تقييمك في معدل {craftsman.name}.
                </p>
              ) : (
                <RatingForm
                  defaultAuthorName={confirmedOrder.customerName}
                  onSubmit={async (stars, comment, authorName) => {
                    await onSubmitReviewAfterOrder(
                      craftsman.id,
                      stars,
                      comment,
                      authorName,
                      confirmedOrder.id
                    );
                    setRatedDone(true);
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            {/* 1. Customer & Location */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">١. بيانات الزبون والموقع</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="الاسم الكامل"
                  required
                  className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="رقم الهاتف (مثال: 07701234567)"
                  required
                  className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594] tabular-nums"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                >
                  {IRAQI_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      محافظة {gov}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المنطقة / الحي / أقرب نقطة دالة"
                  required
                  className="h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-600 tabular-nums">
                  {coords ? (
                    <span className="font-semibold text-[#008594]">
                      إحداثيات GPS المحفوظة: {coords.lat}, {coords.lng}
                    </span>
                  ) : (
                    <span>أرفق موقعك الدقيق لتسهيل وصول الحرفي عبر ويز (Waze)</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#008594] bg-white border border-[#008594]/30 hover:bg-[#008594]/5 rounded-lg cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  {gpsLoading ? "جاري التحديد..." : "تحديد موقعي (GPS)"}
                </button>
              </div>

              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="وصف مختصر للعطل أو العمل المطلوب (اختياري)"
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-[#008594]"
              />
            </div>

            {/* 2. Delivery & Transport Partner */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#008594]" />
                  ٢. خدمة التوصيل ونقل المعدات (اختياري)
                </h3>
                <span className="text-xs text-slate-500">شركاء أوستا المعتمدون</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeliveryPartnerId("none")}
                  className={`p-3 text-right rounded-xl border transition-colors cursor-pointer ${
                    deliveryPartnerId === "none"
                      ? "border-[#008594] bg-[#008594]/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">حضور الحرفي مباشرة</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">بدون رسوم توصيل إضافية (٠ د.ع)</p>
                </button>

                {DELIVERY_PARTNERS.map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => setDeliveryPartnerId(partner.id)}
                    className={`p-3 text-right rounded-xl border transition-colors cursor-pointer ${
                      deliveryPartnerId === partner.id
                        ? "border-[#008594] bg-[#008594]/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {partner.name} ({partner.englishName})
                      </span>
                      <span className="text-xs font-bold text-[#008594] tabular-nums">
                        +{formatIQD(partner.baseFeeIQD)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {partner.serviceType}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Real Payment Method */}
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#008594]" />
                ٣. طريقة الدفع الحقيقية
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("zaincash")}
                  className={`p-3 rounded-xl border text-center transition-colors cursor-pointer ${
                    paymentMethod === "zaincash"
                      ? "border-[#008594] bg-[#008594]/5 text-[#008594]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Wallet className="w-4 h-4 mx-auto mb-1" />
                  <span className="block text-xs font-bold">زين كاش</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("qicard")}
                  className={`p-3 rounded-xl border text-center transition-colors cursor-pointer ${
                    paymentMethod === "qicard"
                      ? "border-[#008594] bg-[#008594]/5 text-[#008594]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1" />
                  <span className="block text-xs font-bold">كي كارد / ماستر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-xl border text-center transition-colors cursor-pointer ${
                    paymentMethod === "cash"
                      ? "border-[#008594] bg-[#008594]/5 text-[#008594]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                  <span className="block text-xs font-bold">نقداً عند الإنجاز</span>
                </button>
              </div>

              {paymentMethod === "zaincash" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="tel"
                    value={zainCashPhone}
                    onChange={(e) => setZainCashPhone(e.target.value)}
                    placeholder="رقم محفظة زين كاش (078... أو 077...)"
                    className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594] tabular-nums"
                  />
                  <input
                    type="password"
                    maxLength={6}
                    value={zainCashOtp}
                    onChange={(e) => setZainCashOtp(e.target.value)}
                    placeholder="رمز التأكيد OTP (٤ أرقام)"
                    className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594] tabular-nums"
                  />
                </div>
              )}

              {paymentMethod === "qicard" && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="رقم البطاقة (١٦ رقماً)"
                    className="sm:col-span-2 h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594] tabular-nums"
                  />
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594] tabular-nums"
                  />
                  <input
                    type="password"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="CVV"
                    maxLength={4}
                    className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008594] tabular-nums"
                  />
                </div>
              )}
            </div>

            {/* Summary & Submit */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5 text-xs text-slate-600 tabular-nums">
                <p>
                  أجرة الكشفية: <strong className="text-slate-900">{formatIQD(visitFeeIQD)}</strong>
                  {deliveryFeeIQD > 0 && (
                    <>
                      {" "}
                      + التوصيل:{" "}
                      <strong className="text-slate-900">{formatIQD(deliveryFeeIQD)}</strong>
                    </>
                  )}
                </p>
                <p className="text-sm font-extrabold text-slate-900">
                  الإجمالي المستحق: {formatIQD(totalIQD)}
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 text-sm font-bold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? "جاري تأكيد الطلب..." : "تأكيد وإتمام الطلب"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
