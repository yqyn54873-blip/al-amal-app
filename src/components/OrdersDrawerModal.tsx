import { CheckCircle2, ClipboardList, ExternalLink, Star, X } from "lucide-react";
import { useState } from "react";
import { DELIVERY_PARTNERS } from "../constants/locations";
import type { Order } from "../types/craftsman";
import { formatIQD } from "../utils/geo";
import { RatingForm } from "./RatingForm";

interface OrdersDrawerModalProps {
  isOpen: boolean;
  orders: Order[];
  onClose: () => void;
  onSubmitReview: (
    craftsmanId: string,
    stars: number,
    comment: string,
    authorName: string,
    orderId: string
  ) => Promise<void>;
}

export function OrdersDrawerModal({
  isOpen,
  orders,
  onClose,
  onSubmitReview,
}: OrdersDrawerModalProps) {
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="طلباتي"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#008594]" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              طلباتي وسجل المدفوعات ({orders.length})
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

        <div className="p-6 space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
              <p className="font-display text-base font-bold text-slate-800">
                لا توجد طلبات مسجلة حالياً
              </p>
              <p className="text-xs text-slate-500">
                اختر حرفياً من القائمة واضغط على «اطلب الآن» لإتمام أول حجز.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const partner = DELIVERY_PARTNERS.find(
                (p) => p.id === order.deliveryPartnerId
              );
              return (
                <div
                  key={order.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-display text-base font-bold text-slate-900">
                        {order.craftsmanName} · {order.craftsmanJob}
                      </p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        طلب رقم {order.id} · {order.governorate} — {order.address}
                      </p>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-extrabold text-slate-900 tabular-nums block">
                        {formatIQD(order.totalIQD)}
                      </span>
                      <span className="text-[11px] font-semibold text-[#008594]">
                        {order.paymentStatus} ({order.paymentReference})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="text-slate-600">
                      التوصيل: <strong className="text-slate-800">{order.deliveryPartnerName}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {partner && (
                        <a
                          href={partner.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          تتبع {partner.name}
                        </a>
                      )}

                      {order.rated ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          تم التقييم
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setRatingOrderId(
                              ratingOrderId === order.id ? null : order.id
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#EF7D1A] hover:bg-[#D96B0B] rounded-lg cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5" />
                          قيّم الحرفي
                        </button>
                      )}
                    </div>
                  </div>

                  {ratingOrderId === order.id && !order.rated && (
                    <div className="pt-2">
                      <RatingForm
                        defaultAuthorName={order.customerName}
                        onSubmit={async (stars, comment, authorName) => {
                          await onSubmitReview(
                            order.craftsmanId,
                            stars,
                            comment,
                            authorName,
                            order.id
                          );
                          setRatingOrderId(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
