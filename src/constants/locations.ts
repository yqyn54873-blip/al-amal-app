export const IRAQI_GOVERNORATES = [
  "بغداد",
  "البصرة",
  "نينوى",
  "أربيل",
  "كركوك",
  "الأنبار",
  "ديالى",
  "صلاح الدين",
  "النجف",
  "كربلاء",
  "بابل",
  "واسط",
  "ميسان",
  "ذي قار",
  "المثنى",
  "القادسية",
  "دهوك",
  "السليمانية",
] as const;

export const COUNTRIES = [
  "العراق",
  "السعودية",
  "الكويت",
  "الإمارات",
  "قطر",
  "البحرين",
  "عمان",
  "الأردن",
  "سوريا",
  "لبنان",
  "مصر",
  "اليمن",
] as const;

export const CRAFT_JOBS = [
  "سباك",
  "كهربائي",
  "نجار",
  "حداد",
  "تكييف وتبريد",
  "صباغ",
  "بناء وترميم",
  "سيراميك وكاشي",
  "ألمنيوم وزجاج",
  "صيانة أجهزة منزلية",
  "فني ستلايت وكاميرات",
  "تنظيف منازل",
] as const;

export const GOVERNORATE_COORDS: Record<string, { lat: number; lng: number }> = {
  "بغداد": { lat: 33.3152, lng: 44.3661 },
  "البصرة": { lat: 30.5085, lng: 47.7804 },
  "نينوى": { lat: 36.3489, lng: 43.1577 },
  "أربيل": { lat: 36.1911, lng: 44.0092 },
  "كركوك": { lat: 35.4681, lng: 44.3922 },
  "الأنبار": { lat: 33.4258, lng: 43.2992 },
  "ديالى": { lat: 33.7486, lng: 44.6436 },
  "صلاح الدين": { lat: 34.6095, lng: 43.6793 },
  "النجف": { lat: 32.0, lng: 44.336 },
  "كربلاء": { lat: 32.616, lng: 44.0249 },
  "بابل": { lat: 32.4637, lng: 44.4196 },
  "واسط": { lat: 32.5128, lng: 45.8182 },
  "ميسان": { lat: 31.8356, lng: 47.1449 },
  "ذي قار": { lat: 31.0439, lng: 46.2573 },
  "المثنى": { lat: 31.332, lng: 45.2944 },
  "القادسية": { lat: 31.9889, lng: 44.9255 },
  "دهوك": { lat: 36.8669, lng: 42.9503 },
  "السليمانية": { lat: 35.5613, lng: 45.4309 },
};

export interface DeliveryPartner {
  id: string;
  name: string;
  englishName: string;
  serviceType: string;
  baseFeeIQD: number;
  etaMinutes: string;
  coverage: string;
  websiteUrl: string;
  accentColor: string;
}

export const DELIVERY_PARTNERS: DeliveryPartner[] = [
  {
    id: "baly",
    name: "بلي",
    englishName: "Baly",
    serviceType: "توصيل الحرفي ونقل العدد السريع",
    baseFeeIQD: 4000,
    etaMinutes: "15 - 25 دقيقة",
    coverage: "بغداد، البصرة، أربيل، النجف، كربلاء",
    websiteUrl: "https://baly.iq",
    accentColor: "#008594",
  },
  {
    id: "talabaty",
    name: "طلباتي",
    englishName: "Talabaty",
    serviceType: "توصيل المواد الاحتياطية والأدوات المنزلية",
    baseFeeIQD: 3500,
    etaMinutes: "20 - 35 دقيقة",
    coverage: "جميع محافظات العراق الثماني عشرة",
    websiteUrl: "https://talabaty.com",
    accentColor: "#EF7D1A",
  },
  {
    id: "careem",
    name: "كريم",
    englishName: "Careem",
    serviceType: "نقل الكوادر الفنية والمعدات الثقيلة",
    baseFeeIQD: 5000,
    etaMinutes: "12 - 20 دقيقة",
    coverage: "بغداد، أربيل، البصرة، الموصل",
    websiteUrl: "https://www.careem.com",
    accentColor: "#0F766E",
  },
  {
    id: "talabat_delivery",
    name: "طلبات توصيل",
    englishName: "Talabat Delivery",
    serviceType: "شحن مستلزمات الصيانة والسباكة والكهرباء",
    baseFeeIQD: 3000,
    etaMinutes: "25 - 40 دقيقة",
    coverage: "بغداد، بابل، كربلاء، النجف، كركوك",
    websiteUrl: "https://www.talabat.com/iraq",
    accentColor: "#D96B0B",
  },
];

export interface SponsoredOffer {
  id: string;
  sponsorName: string;
  title: string;
  description: string;
  governorate: string;
  discountCode: string;
  ctaLabel: string;
  targetJobFilter?: string;
}

export const SPONSORED_OFFERS: SponsoredOffer[] = [
  {
    id: "offer-aseel-tools",
    sponsorName: "مجمع الأصيل للمعدات الكهربائية والسباكة",
    title: "خصم ١٥٪ لزبائن أوستا على مستلزمات السباكة والإنارة الأصلية",
    description:
      "توصيل مباشر لموقع العمل خلال ٣٠ دقيقة عبر شركاء طلباتي وبلي داخل بغداد والمحافظات.",
    governorate: "بغداد وجميع المحافظات",
    discountCode: "OUSTA15",
    ctaLabel: "تصفح فنيي الكهرباء والسباكة",
    targetJobFilter: "كهربائي",
  },
  {
    id: "offer-baly-first",
    sponsorName: "شراكة بلي × أوستا",
    title: "توصيل مجاني لأول طلب مواد احتياطية عند حجز حرفي عبر التطبيق",
    description:
      "استخدم خدمة التوصيل المدمجة داخل نافذة الطلب للحصول على قطع الغيار دون الحاجة لمغادرة منزلك.",
    governorate: "بغداد · البصرة · أربيل · النجف",
    discountCode: "BALYFREE",
    ctaLabel: "اطلب الآن مع التوصيل",
  },
];
