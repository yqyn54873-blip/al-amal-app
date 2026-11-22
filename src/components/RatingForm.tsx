import { Star } from "lucide-react";
import { useState } from "react";

interface RatingFormProps {
  defaultAuthorName?: string;
  onSubmit: (stars: number, comment: string, authorName: string) => Promise<void> | void;
}

export function RatingForm({ defaultAuthorName = "", onSubmit }: RatingFormProps) {
  const [stars, setStars] = useState<number>(5);
  const [hovered, setHovered] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(stars, comment.trim(), authorName.trim() || "زبون أوستا");
      setComment("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-900">
          قيّم جودة الخدمة (من ١ إلى ٥ نجوم)
        </span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="اختر التقييم">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = (hovered || stars) >= value;
            return (
              <button
                key={value}
                type="button"
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setStars(value)}
                aria-label={`${value} نجوم`}
                className="p-1 rounded hover:scale-110 transition-transform cursor-pointer"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    active ? "fill-[#EF7D1A] text-[#EF7D1A]" : "text-slate-300"
                  }`}
                />
              </button>
            );
          })}
          <span className="mr-1.5 text-xs font-bold text-slate-700 tabular-nums">
            {stars} / 5
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="اسمك (اختياري)"
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008594]"
        />
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="اكتب تعليقك عن التجربة والالتزام بالموعد..."
          required
          className="sm:col-span-2 h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#008594]"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {submitted ? (
          <span className="text-xs font-semibold text-emerald-700">
            تم إرسال تقييمك وتحديث معدل الحرفي بنجاح!
          </span>
        ) : (
          <span className="text-xs text-slate-500">
            يتم تحديث معدل النجوم فوراً في ملف الحرفي.
          </span>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#008594] hover:bg-[#006B78] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {submitting ? "جاري الإرسال..." : "أرسل التقييم"}
        </button>
      </div>
    </form>
  );
}
