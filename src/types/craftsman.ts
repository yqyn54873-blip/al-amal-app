export type ModerationStatus = "approved" | "pending" | "rejected";

export interface Review {
  id: string;
  authorName: string;
  stars: number;
  comment: string;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  image: string;
  caption: string;
  governorate: string;
  createdAt: string;
  status?: ModerationStatus;
}

export type Craftsman = {
  id: string;
  name: string;
  job: string;
  governorate: string;
  country: string;
  phone: string;
  experienceYears: number;
  description: string;
  rating: number;
  reviewsCount: number;
  image: string;
  lat: number;
  lng: number;
  visitFeeIQD: number;
  verified?: boolean;
  status?: ModerationStatus;
  portfolio: PortfolioItem[];
  reviews: Review[];
};

export type PaymentMethodId = "zaincash" | "qicard" | "cash";

export type OrderStatus =
  | "تم تأكيد الطلب"
  | "قيد المراجعة"
  | "موافق عليه"
  | "قيد التنفيذ"
  | "مكتمل"
  | "مرفوض";

export interface Order {
  id: string;
  craftsmanId: string;
  craftsmanName: string;
  craftsmanJob: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  address: string;
  notes: string;
  deliveryPartnerId: string | "none";
  deliveryPartnerName: string;
  paymentMethod: PaymentMethodId;
  paymentStatus: "مدفوع إلكترونياً" | "دفع عند الإنجاز";
  paymentReference: string;
  visitFeeIQD: number;
  deliveryFeeIQD: number;
  totalIQD: number;
  customerLat?: number;
  customerLng?: number;
  status: OrderStatus;
  createdAt: string;
  rated: boolean;
}

export interface UserSession {
  id: string;
  name: string;
  phone: string;
  role: "customer" | "craftsman";
  governorate: string;
  country: string;
  craftsmanId?: string;
  rememberMe: boolean;
  status?: ModerationStatus;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  phone: string;
  role: "customer" | "craftsman";
  governorate: string;
  country: string;
  craftsmanId?: string;
  status: ModerationStatus;
  createdAt: string;
}

export interface SponsoredAd {
  id: string;
  sponsorName: string;
  title: string;
  description: string;
  governorate: string;
  discountCode: string;
  ctaLabel: string;
  targetJobFilter?: string;
  status: ModerationStatus;
  createdAt: string;
}
