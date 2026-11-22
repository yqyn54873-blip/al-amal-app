import { Compass, RotateCcw, Search } from "lucide-react";
import { COUNTRIES, CRAFT_JOBS, IRAQI_GOVERNORATES } from "../constants/locations";

interface CraftsmanFilterProps {
  governorate: string;
  job: string;
  search: string;
  country: string;
  gpsActive: boolean;
  gpsLoading: boolean;
  onChange: (gov: string, job: string, search: string, country?: string) => void;
  onRequestGps: () => void;
  onReset: () => void;
}

export function CraftsmanFilter({
  governorate,
  job,
  search,
  country,
  gpsActive,
  gpsLoading,
  onChange,
  onRequestGps,
  onReset,
}: CraftsmanFilterProps) {
  const hasFilters = Boolean(governorate || job || search || (country && country !== "العراق"));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Search by name or description */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onChange(governorate, job, e.target.value, country)}
            placeholder="بحث بالاسم أو الخدمة..."
            aria-label="بحث بالاسم"
            className="w-full h-11 pr-10 pl-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#008594] transition-colors"
          />
        </div>

        {/* Governorate Filter — strictly IRAQI_GOVERNORATES (18) */}
        <div className="lg:col-span-3">
          <select
            value={governorate}
            onChange={(e) => onChange(e.target.value, job, search, country)}
            aria-label="فلتر المحافظة"
            className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-[#008594] transition-colors"
          >
            <option value="">كل المحافظات (١٨ محافظة)</option>
            {IRAQI_GOVERNORATES.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
        </div>

        {/* Craft / Job Filter */}
        <div className="lg:col-span-3">
          <select
            value={job}
            onChange={(e) => onChange(governorate, e.target.value, search, country)}
            aria-label="فلتر المهنة"
            className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-[#008594] transition-colors"
          >
            <option value="">كل المهن والحرف</option>
            {CRAFT_JOBS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
        </div>

        {/* Country Filter — Iraq first, then 11 Arab countries */}
        <div className="lg:col-span-2">
          <select
            value={country}
            onChange={(e) => onChange(governorate, job, search, e.target.value)}
            aria-label="فلتر الدولة"
            className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-[#008594] transition-colors"
          >
            <option value="">كل الدول</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick interactive craft tabs & GPS sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => onChange(governorate, "", search, country)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              job === ""
                ? "bg-[#008594] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            الكل
          </button>
          {CRAFT_JOBS.slice(0, 6).map((quickJob) => (
            <button
              key={quickJob}
              type="button"
              onClick={() =>
                onChange(governorate, job === quickJob ? "" : quickJob, search, country)
              }
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                job === quickJob
                  ? "bg-[#008594] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {quickJob}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRequestGps}
            disabled={gpsLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              gpsActive
                ? "bg-[#008594]/10 text-[#008594] border border-[#008594]/30"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            {gpsLoading ? "جاري التحديد..." : gpsActive ? "تم ترتيب الأقرب عبر GPS" : "الأقرب لموقعي (GPS)"}
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              إعادة ضبط
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
