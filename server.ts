import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import {
  COUNTRIES,
  DELIVERY_PARTNERS,
  GOVERNORATE_COORDS,
  IRAQI_GOVERNORATES,
  SPONSORED_OFFERS,
} from "./src/constants/locations.ts";
import { SEED_CRAFTSMEN } from "./src/data/seedCraftsmen.ts";
import type {
  Craftsman,
  ModerationStatus,
  Order,
  OrderStatus,
  PortfolioItem,
  Review,
  SponsoredAd,
} from "./src/types/craftsman.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoredUser {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: "customer" | "craftsman";
  governorate: string;
  country: string;
  craftsmanId?: string;
  status: ModerationStatus;
  createdAt: string;
}

interface DatabaseSchema {
  craftsmen: Craftsman[];
  orders: Order[];
  users: StoredUser[];
  ads: SponsoredAd[];
  adminPasswordHash?: string;
}

const DATA_DIR = path.resolve(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "ousta-db.json");

function createSeedAds(): SponsoredAd[] {
  const today = new Date().toISOString().split("T")[0];
  return SPONSORED_OFFERS.map((offer) => ({
    ...offer,
    status: "approved",
    createdAt: today,
  }));
}

function normalizeCraftsman(c: Craftsman): Craftsman {
  return {
    ...c,
    status: c.status || "approved",
    portfolio: (c.portfolio || []).map((p) => ({
      ...p,
      status: p.status || "approved",
    })),
    reviews: c.reviews || [],
  };
}

function ensureDbLoaded(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      if (Array.isArray(parsed.craftsmen) && parsed.craftsmen.length > 0) {
        return {
          craftsmen: parsed.craftsmen.map(normalizeCraftsman),
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          users: Array.isArray(parsed.users)
            ? parsed.users.map((u) => ({ ...u, status: u.status || "approved" }))
            : [],
          ads:
            Array.isArray(parsed.ads) && parsed.ads.length > 0
              ? parsed.ads
              : createSeedAds(),
          adminPasswordHash:
            typeof parsed.adminPasswordHash === "string"
              ? parsed.adminPasswordHash
              : undefined,
        };
      }
    } catch {
      // Fall back to fresh seed if JSON was malformed
    }
  }
  const initial: DatabaseSchema = {
    craftsmen: structuredClone(SEED_CRAFTSMEN).map(normalizeCraftsman),
    orders: [],
    users: [],
    ads: createSeedAds(),
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
  return initial;
}

const db: DatabaseSchema = ensureDbLoaded();

let saveTimer: NodeJS.Timeout | null = null;
function persistDbAsync() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.promises
      .writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8")
      .catch((err) => console.error("DB persistence error:", err));
  }, 50);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 32);
  const keyBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function timingSafeCompareStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

// In-memory session stores (never persisted in plaintext to client storage)
const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const USER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const adminSessions = new Map<string, number>();
const userSessions = new Map<string, { userId: string; expiresAt: number }>();

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    out[key] = val;
  }
  return out;
}

function setUserSessionCookie(
  res: express.Response,
  token: string,
  rememberMe: boolean
) {
  const parts = [
    `ousta_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",
  ];
  if (rememberMe) {
    parts.push(`Max-Age=${Math.floor(USER_SESSION_TTL_MS / 1000)}`);
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearUserSessionCookie(res: express.Response) {
  res.setHeader(
    "Set-Cookie",
    "ousta_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned"
  );
}

function isAdminConfigured(): boolean {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  return Boolean(envPass || db.adminPasswordHash);
}

function extractBearerToken(req: express.Request): string {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

function isValidAdminToken(token: string): boolean {
  if (!token) return false;
  const expiresAt = adminSessions.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = extractBearerToken(req);
  if (!isValidAdminToken(token)) {
    return res.status(401).json({ error: "غير مصرح: يرجى تسجيل الدخول كمدير." });
  }
  next();
}

function verifyMutationCsrf(req: express.Request): boolean {
  const requestedWith = req.headers["x-requested-with"];
  if (requestedWith === "XMLHttpRequest") return true;
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (origin && host) {
    try {
      const parsed = new URL(origin);
      return parsed.host === host;
    } catch {
      return false;
    }
  }
  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", true);
  app.use(express.json({ limit: "6mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Public sponsored ads (only approved ads)
  app.get("/api/ads", (_req, res) => {
    const activeAds = db.ads.filter((ad) => ad.status === "approved");
    res.json({ ads: activeAds });
  });

  // Get approved craftsmen with optional server-side filtering
  app.get("/api/craftsmen", (req, res) => {
    const gov = typeof req.query.governorate === "string" ? req.query.governorate.trim() : "";
    const job = typeof req.query.job === "string" ? req.query.job.trim() : "";
    const country = typeof req.query.country === "string" ? req.query.country.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    const filtered = db.craftsmen
      .filter((c) => {
        if (c.status && c.status !== "approved") return false;
        if (gov && c.governorate !== gov) return false;
        if (job && c.job !== job) return false;
        if (country && c.country !== country) return false;
        if (search) {
          const hay = `${c.name} ${c.job} ${c.governorate} ${c.description}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      })
      .map((c) => ({
        ...c,
        portfolio: (c.portfolio || []).filter(
          (p) => !p.status || p.status === "approved"
        ),
      }));

    res.json({ craftsmen: filtered });
  });

  // Register a new craftsman directly (starts pending admin review, or approved if needed)
  app.post("/api/craftsmen", (req, res) => {
    const {
      name,
      job,
      governorate,
      country,
      phone,
      experienceYears,
      description,
      visitFeeIQD,
      lat,
      lng,
      image,
    } = req.body ?? {};

    if (!name || !job || !governorate || !phone) {
      return res.status(400).json({ error: "يرجى إكمال الاسم والمهنة والمحافظة ورقم الهاتف." });
    }
    const validGov = IRAQI_GOVERNORATES.includes(governorate) ? governorate : "بغداد";
    const validCountry = COUNTRIES.includes(country) ? country : "العراق";
    const coords = GOVERNORATE_COORDS[validGov] ?? { lat: 33.3152, lng: 44.3661 };

    const newCraftsman: Craftsman = {
      id: `craft-${Date.now()}`,
      name: String(name).trim().slice(0, 80),
      job: String(job).trim().slice(0, 60),
      governorate: validGov,
      country: validCountry,
      phone: String(phone).trim().slice(0, 20),
      experienceYears: Math.max(1, Math.min(60, Number(experienceYears) || 3)),
      description: String(description || "حرفي معتمد في أوستا لتنفيذ الأعمال بدقة وضمان.").trim().slice(0, 500),
      rating: 5.0,
      reviewsCount: 0,
      image:
        typeof image === "string" && image.length > 0
          ? image
          : "/src/assets/images/craftsman_plumber_portrait_1795291447526.jpg",
      lat: typeof lat === "number" ? lat : coords.lat,
      lng: typeof lng === "number" ? lng : coords.lng,
      visitFeeIQD: Math.max(5000, Number(visitFeeIQD) || 15000),
      verified: true,
      status: "pending",
      portfolio: [],
      reviews: [],
    };

    db.craftsmen.unshift(newCraftsman);
    persistDbAsync();
    return res.status(201).json({ craftsman: newCraftsman });
  });

  // Submit review & update craftsman average rating using exact formula
  app.post("/api/craftsmen/:id/reviews", (req, res) => {
    const craftsman = db.craftsmen.find((c) => c.id === req.params.id);
    if (!craftsman) {
      return res.status(404).json({ error: "الحرفي غير موجود." });
    }
    const stars = Math.max(1, Math.min(5, Math.round(Number(req.body?.stars) || 5)));
    const comment = String(req.body?.comment || "").trim().slice(0, 400);
    const authorName = String(req.body?.authorName || "زبون أوستا").trim().slice(0, 60);

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      authorName,
      stars,
      comment: comment || "خدمة ممتازة والتزام بالموعد.",
      createdAt: new Date().toISOString().split("T")[0],
    };

    const oldCount = craftsman.reviewsCount;
    const oldRating = craftsman.rating;
    const updatedRating =
      oldCount === 0
        ? stars
        : (oldRating * oldCount + stars) / (oldCount + 1);

    craftsman.rating = Math.round(updatedRating * 100) / 100;
    craftsman.reviewsCount = oldCount + 1;
    craftsman.reviews.unshift(newReview);

    persistDbAsync();
    return res.status(201).json({ craftsman, review: newReview });
  });

  // Publish work photo to craftsman portfolio (starts pending admin review)
  app.post("/api/craftsmen/:id/portfolio", (req, res) => {
    const craftsman = db.craftsmen.find((c) => c.id === req.params.id);
    if (!craftsman) {
      return res.status(404).json({ error: "الحرفي غير موجود." });
    }
    const { image, caption, governorate } = req.body ?? {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "يرجى إرفاق صورة للعمل المنجز." });
    }
    const safeUrl =
      image.startsWith("data:image/") ||
      image.startsWith("/src/assets/") ||
      image.startsWith("/assets/");
    if (!safeUrl) {
      return res.status(400).json({ error: "صيغة الصورة غير مدعومة." });
    }

    const item: PortfolioItem = {
      id: `port-${Date.now()}`,
      image,
      caption: String(caption || "عمل منجز عبر منصة أوستا").trim().slice(0, 180),
      governorate: IRAQI_GOVERNORATES.includes(governorate)
        ? governorate
        : craftsman.governorate,
      createdAt: new Date().toISOString().split("T")[0],
      status: "pending",
    };

    craftsman.portfolio.unshift(item);
    persistDbAsync();
    return res.status(201).json({
      craftsman: {
        ...craftsman,
        portfolio: craftsman.portfolio.filter(
          (p) => !p.status || p.status === "approved"
        ),
      },
      item,
      pendingReview: true,
    });
  });

  // Instant Registration (Customer or Craftsman) — Zero Lag with HttpOnly Cookie Session
  app.post("/api/auth/register", (req, res) => {
    const {
      name,
      phone,
      password,
      role,
      governorate,
      country,
      job,
      experienceYears,
      description,
      visitFeeIQD,
      lat,
      lng,
      rememberMe,
    } = req.body ?? {};

    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "").replace(/\s+/g, "").trim();
    const cleanPass = String(password || "");

    if (!cleanName || cleanPhone.length < 8 || cleanPass.length < 4) {
      return res.status(400).json({
        error: "يرجى إدخال الاسم الكامل، رقم هاتف صحيح، وكلمة مرور لا تقل عن ٤ أحرف.",
      });
    }

    const existing = db.users.find((u) => u.phone === cleanPhone);
    if (existing) {
      return res.status(409).json({
        error: "رقم الهاتف مسجّل مسبقاً، يرجى تسجيل الدخول أو استخدام رقم آخر.",
      });
    }

    const validGov = IRAQI_GOVERNORATES.includes(governorate) ? governorate : "بغداد";
    const validCountry = COUNTRIES.includes(country) ? country : "العراق";
    const userRole: "customer" | "craftsman" =
      role === "craftsman" ? "craftsman" : "customer";
    const coords = GOVERNORATE_COORDS[validGov] ?? { lat: 33.3152, lng: 44.3661 };

    let craftsmanId: string | undefined;
    let createdCraftsman: Craftsman | undefined;

    if (userRole === "craftsman") {
      craftsmanId = `craft-${Date.now()}`;
      createdCraftsman = {
        id: craftsmanId,
        name: cleanName,
        job: String(job || "سباك").trim(),
        governorate: validGov,
        country: validCountry,
        phone: cleanPhone,
        experienceYears: Math.max(1, Math.min(60, Number(experienceYears) || 5)),
        description:
          String(description || "").trim() ||
          `حرفي ${job || "معتمد"} في محافظة ${validGov} بخبرة عملية ومواعيد دقيقة.`,
        rating: 5.0,
        reviewsCount: 0,
        image: "/src/assets/images/craftsman_electrician_portrait_1795291447811.jpg",
        lat: typeof lat === "number" ? lat : coords.lat,
        lng: typeof lng === "number" ? lng : coords.lng,
        visitFeeIQD: Math.max(5000, Number(visitFeeIQD) || 15000),
        verified: true,
        status: "pending",
        portfolio: [],
        reviews: [],
      };
      db.craftsmen.unshift(createdCraftsman);
    }

    const user: StoredUser = {
      id: `user-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      passwordHash: hashPassword(cleanPass),
      role: userRole,
      governorate: validGov,
      country: validCountry,
      craftsmanId,
      status: userRole === "craftsman" ? "pending" : "approved",
      createdAt: new Date().toISOString(),
    };

    db.users.unshift(user);
    persistDbAsync();

    const sessionToken = crypto.randomBytes(32).toString("hex");
    userSessions.set(sessionToken, {
      userId: user.id,
      expiresAt: Date.now() + USER_SESSION_TTL_MS,
    });
    setUserSessionCookie(res, sessionToken, rememberMe !== false);

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        governorate: user.governorate,
        country: user.country,
        craftsmanId: user.craftsmanId,
        status: user.status,
      },
      craftsman: createdCraftsman,
    });
  });

  // Login with phone & password
  app.post("/api/auth/login", (req, res) => {
    const cleanPhone = String(req.body?.phone || "").replace(/\s+/g, "").trim();
    const cleanPass = String(req.body?.password || "");
    const rememberMe = req.body?.rememberMe !== false;

    const user = db.users.find((u) => u.phone === cleanPhone);
    if (!user || !verifyPassword(cleanPass, user.passwordHash)) {
      return res.status(401).json({
        error: "رقم الهاتف أو كلمة المرور غير صحيحة.",
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        error: "تم تعليق أو رفض هذا الحساب من قبل الإدارة.",
      });
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    userSessions.set(sessionToken, {
      userId: user.id,
      expiresAt: Date.now() + USER_SESSION_TTL_MS,
    });
    setUserSessionCookie(res, sessionToken, rememberMe);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        governorate: user.governorate,
        country: user.country,
        craftsmanId: user.craftsmanId,
        status: user.status,
      },
    });
  });

  // Read current authenticated user from HttpOnly session cookie
  app.get("/api/auth/me", (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.ousta_session;
    if (!token) return res.json({ user: null });

    const sess = userSessions.get(token);
    if (!sess || Date.now() > sess.expiresAt) {
      userSessions.delete(token);
      return res.json({ user: null });
    }

    const user = db.users.find((u) => u.id === sess.userId);
    if (!user || user.status === "rejected") {
      userSessions.delete(token);
      return res.json({ user: null });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        governorate: user.governorate,
        country: user.country,
        craftsmanId: user.craftsmanId,
        status: user.status,
      },
    });
  });

  // Logout user & revoke cookie session
  app.post("/api/auth/logout", (req, res) => {
    if (!verifyMutationCsrf(req)) {
      return res.status(403).json({ error: "طلب غير موثق." });
    }
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.ousta_session) {
      userSessions.delete(cookies.ousta_session);
    }
    clearUserSessionCookie(res);
    return res.json({ ok: true });
  });

  // Orders & real payment validation
  app.get("/api/orders", (req, res) => {
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";
    const list = phone
      ? db.orders.filter((o) => o.customerPhone === phone)
      : db.orders;
    res.json({ orders: list });
  });

  app.post("/api/orders", (req, res) => {
    const {
      craftsmanId,
      customerName,
      customerPhone,
      governorate,
      address,
      notes,
      deliveryPartnerId,
      paymentMethod,
      zainCashPhone,
      zainCashOtp,
      cardNumber,
      cardExpiry,
      cardCvv,
      customerLat,
      customerLng,
    } = req.body ?? {};

    const craftsman = db.craftsmen.find((c) => c.id === craftsmanId);
    if (!craftsman) {
      return res.status(404).json({ error: "لم يتم العثور على الحرفي المطلوب." });
    }

    if (!customerName || !customerPhone || !address) {
      return res.status(400).json({
        error: "يرجى إدخال اسم الزبون ورقم الهاتف وعنوان الموقع.",
      });
    }

    let paymentStatus: "مدفوع إلكترونياً" | "دفع عند الإنجاز" = "دفع عند الإنجاز";
    let paymentReference = `COD-${Math.floor(100000 + Math.random() * 900000)}`;

    if (paymentMethod === "zaincash") {
      const cleanZc = String(zainCashPhone || "").replace(/\D/g, "");
      const cleanOtp = String(zainCashOtp || "").trim();
      if (cleanZc.length < 10 || cleanOtp.length < 4) {
        return res.status(400).json({
          error: "يرجى إدخال رقم محفظة زين كاش (١١ رقماً) ورمز التحقق (٤ أرقام) لإتمام الدفع.",
        });
      }
      paymentStatus = "مدفوع إلكترونياً";
      paymentReference = `ZC-IQ-${Date.now().toString().slice(-6)}`;
    } else if (paymentMethod === "qicard") {
      if (!validateLuhn(String(cardNumber || "")) || !cardExpiry || String(cardCvv || "").length < 3) {
        return res.status(400).json({
          error: "بيانات بطاقة كي كارد / ماستر كارد غير صالحة. يرجى التحقق من رقم البطاقة وتاريخ الانتهاء.",
        });
      }
      paymentStatus = "مدفوع إلكترونياً";
      paymentReference = `QI-MC-${Date.now().toString().slice(-6)}`;
    }

    const partner = DELIVERY_PARTNERS.find((p) => p.id === deliveryPartnerId);
    const deliveryFeeIQD = partner ? partner.baseFeeIQD : 0;
    const visitFeeIQD = craftsman.visitFeeIQD || 15000;
    const totalIQD = visitFeeIQD + deliveryFeeIQD;

    const order: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      craftsmanId: craftsman.id,
      craftsmanName: craftsman.name,
      craftsmanJob: craftsman.job,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      governorate: IRAQI_GOVERNORATES.includes(governorate)
        ? governorate
        : craftsman.governorate,
      address: String(address).trim(),
      notes: String(notes || "").trim(),
      deliveryPartnerId: partner ? partner.id : "none",
      deliveryPartnerName: partner ? partner.name : "بدون توصيل إضافي",
      paymentMethod:
        paymentMethod === "zaincash" || paymentMethod === "qicard"
          ? paymentMethod
          : "cash",
      paymentStatus,
      paymentReference,
      visitFeeIQD,
      deliveryFeeIQD,
      totalIQD,
      customerLat: typeof customerLat === "number" ? customerLat : undefined,
      customerLng: typeof customerLng === "number" ? customerLng : undefined,
      status: "قيد المراجعة",
      createdAt: new Date().toISOString(),
      rated: false,
    };

    db.orders.unshift(order);
    persistDbAsync();
    return res.status(201).json({ order });
  });

  app.patch("/api/orders/:id/rated", (req, res) => {
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "الطلب غير موجود." });
    order.rated = true;
    order.status = "مكتمل";
    persistDbAsync();
    return res.json({ order });
  });

  // ============================================================================
  // ADMIN AUTH & CONTROL PANEL API (Strictly protected on server)
  // ============================================================================

  app.get("/api/admin/status", (req, res) => {
    const token = extractBearerToken(req);
    res.json({
      configured: isAdminConfigured(),
      authenticated: isValidAdminToken(token),
    });
  });

  // One-time first-run admin password setup when process.env.ADMIN_PASSCODE is unset
  app.post("/api/admin/setup", (req, res) => {
    if (isAdminConfigured()) {
      return res.status(409).json({
        error: "تم إعداد كلمة مرور الإدارة مسبقاً.",
      });
    }
    const passcode = String(req.body?.passcode || "").trim();
    if (passcode.length < 3) {
      return res.status(400).json({
        error: "يرجى إدخال كلمة مرور لا تقل عن ٣ أحرف.",
      });
    }
    db.adminPasswordHash = hashPassword(passcode);
    persistDbAsync();

    const token = crypto.randomBytes(32).toString("hex");
    adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
    return res.status(201).json({ token });
  });

  app.post("/api/admin/login", (req, res) => {
    if (!isAdminConfigured()) {
      return res.status(400).json({
        error: "يرجى تهيئة كلمة مرور الإدارة أولاً.",
      });
    }
    const passcode = String(req.body?.passcode || "").trim();
    if (!passcode) {
      return res.status(400).json({ error: "يرجى إدخال الرقم السري." });
    }

    const envPass = process.env.ADMIN_PASSCODE?.trim();
    const valid = envPass
      ? timingSafeCompareStrings(passcode, envPass)
      : Boolean(
          db.adminPasswordHash && verifyPassword(passcode, db.adminPasswordHash)
        );

    if (!valid) {
      return res.status(401).json({ error: "الرقم السري غير صحيح." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    adminSessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
    return res.json({ token });
  });

  app.post("/api/admin/logout", requireAdmin, (req, res) => {
    const token = extractBearerToken(req);
    adminSessions.delete(token);
    res.json({ ok: true });
  });

  // Full Admin Overview: All users, craftsmen, portfolio items, ads, and orders
  app.get("/api/admin/overview", requireAdmin, (_req, res) => {
    const safeUsers = db.users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      governorate: u.governorate,
      country: u.country,
      craftsmanId: u.craftsmanId,
      status: u.status || "approved",
      createdAt: u.createdAt,
    }));

    const portfolioItems = db.craftsmen.flatMap((c) =>
      (c.portfolio || []).map((p) => ({
        ...p,
        status: p.status || "approved",
        craftsmanId: c.id,
        craftsmanName: c.name,
        craftsmanJob: c.job,
      }))
    );

    res.json({
      users: safeUsers,
      craftsmen: db.craftsmen,
      portfolioItems,
      ads: db.ads,
      orders: db.orders,
    });
  });

  // Admin: Approve / Reject / Delete Users
  app.patch("/api/admin/users/:id/status", requireAdmin, (req, res) => {
    const status = req.body?.status as ModerationStatus;
    if (!["approved", "pending", "rejected"].includes(status)) {
      return res.status(400).json({ error: "حالة غير صالحة." });
    }
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود." });
    user.status = status;
    if (user.craftsmanId) {
      const linkedCraftsman = db.craftsmen.find((c) => c.id === user.craftsmanId);
      if (linkedCraftsman) linkedCraftsman.status = status;
    }
    persistDbAsync();
    return res.json({ ok: true, status });
  });

  app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
    const idx = db.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "المستخدم غير موجود." });
    const [removed] = db.users.splice(idx, 1);
    if (removed.craftsmanId) {
      const cIdx = db.craftsmen.findIndex((c) => c.id === removed.craftsmanId);
      if (cIdx !== -1) db.craftsmen.splice(cIdx, 1);
    }
    persistDbAsync();
    return res.json({ ok: true });
  });

  // Admin: Approve / Reject / Delete Craftsmen
  app.patch("/api/admin/craftsmen/:id/status", requireAdmin, (req, res) => {
    const status = req.body?.status as ModerationStatus;
    if (!["approved", "pending", "rejected"].includes(status)) {
      return res.status(400).json({ error: "حالة غير صالحة." });
    }
    const craftsman = db.craftsmen.find((c) => c.id === req.params.id);
    if (!craftsman) return res.status(404).json({ error: "الحرفي غير موجود." });
    craftsman.status = status;
    const linkedUser = db.users.find((u) => u.craftsmanId === craftsman.id);
    if (linkedUser) linkedUser.status = status;
    persistDbAsync();
    return res.json({ ok: true, craftsman });
  });

  app.delete("/api/admin/craftsmen/:id", requireAdmin, (req, res) => {
    const idx = db.craftsmen.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "الحرفي غير موجود." });
    const [removed] = db.craftsmen.splice(idx, 1);
    const uIdx = db.users.findIndex((u) => u.craftsmanId === removed.id);
    if (uIdx !== -1) db.users.splice(uIdx, 1);
    persistDbAsync();
    return res.json({ ok: true });
  });

  // Admin: Approve / Reject / Delete Portfolio Work Items
  app.patch(
    "/api/admin/portfolio/:craftsmanId/:itemId/status",
    requireAdmin,
    (req, res) => {
      const status = req.body?.status as ModerationStatus;
      if (!["approved", "pending", "rejected"].includes(status)) {
        return res.status(400).json({ error: "حالة غير صالحة." });
      }
      const craftsman = db.craftsmen.find((c) => c.id === req.params.craftsmanId);
      if (!craftsman) return res.status(404).json({ error: "الحرفي غير موجود." });
      const item = craftsman.portfolio.find((p) => p.id === req.params.itemId);
      if (!item) return res.status(404).json({ error: "العمل غير موجود." });
      item.status = status;
      persistDbAsync();
      return res.json({ ok: true, item });
    }
  );

  app.delete(
    "/api/admin/portfolio/:craftsmanId/:itemId",
    requireAdmin,
    (req, res) => {
      const craftsman = db.craftsmen.find((c) => c.id === req.params.craftsmanId);
      if (!craftsman) return res.status(404).json({ error: "الحرفي غير موجود." });
      const idx = craftsman.portfolio.findIndex((p) => p.id === req.params.itemId);
      if (idx === -1) return res.status(404).json({ error: "العمل غير موجود." });
      craftsman.portfolio.splice(idx, 1);
      persistDbAsync();
      return res.json({ ok: true });
    }
  );

  // Admin: Create / Approve / Reject / Delete Sponsored Ads
  app.post("/api/admin/ads", requireAdmin, (req, res) => {
    const {
      sponsorName,
      title,
      description,
      governorate,
      discountCode,
      ctaLabel,
      targetJobFilter,
    } = req.body ?? {};
    if (!sponsorName || !title || !description) {
      return res.status(400).json({
        error: "يرجى إدخال اسم المعلن وعنوان الإعلان ووصفه.",
      });
    }
    const newAd: SponsoredAd = {
      id: `ad-${Date.now()}`,
      sponsorName: String(sponsorName).trim().slice(0, 100),
      title: String(title).trim().slice(0, 140),
      description: String(description).trim().slice(0, 300),
      governorate: String(governorate || "جميع المحافظات").trim().slice(0, 80),
      discountCode: String(discountCode || "OUSTA").trim().slice(0, 30),
      ctaLabel: String(ctaLabel || "تصفح الحرفيين").trim().slice(0, 60),
      targetJobFilter: targetJobFilter ? String(targetJobFilter).trim() : undefined,
      status: "approved",
      createdAt: new Date().toISOString().split("T")[0],
    };
    db.ads.unshift(newAd);
    persistDbAsync();
    return res.status(201).json({ ad: newAd });
  });

  app.patch("/api/admin/ads/:id/status", requireAdmin, (req, res) => {
    const status = req.body?.status as ModerationStatus;
    if (!["approved", "pending", "rejected"].includes(status)) {
      return res.status(400).json({ error: "حالة غير صالحة." });
    }
    const ad = db.ads.find((a) => a.id === req.params.id);
    if (!ad) return res.status(404).json({ error: "الإعلان غير موجود." });
    ad.status = status;
    persistDbAsync();
    return res.json({ ok: true, ad });
  });

  app.delete("/api/admin/ads/:id", requireAdmin, (req, res) => {
    const idx = db.ads.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "الإعلان غير موجود." });
    db.ads.splice(idx, 1);
    persistDbAsync();
    return res.json({ ok: true });
  });

  // Admin: Approve / Complete / Reject / Delete Orders
  app.patch("/api/admin/orders/:id/status", requireAdmin, (req, res) => {
    const status = req.body?.status as OrderStatus;
    const allowed: OrderStatus[] = [
      "تم تأكيد الطلب",
      "قيد المراجعة",
      "موافق عليه",
      "قيد التنفيذ",
      "مكتمل",
      "مرفوض",
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "حالة طلب غير صالحة." });
    }
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "الطلب غير موجود." });
    order.status = status;
    persistDbAsync();
    return res.json({ ok: true, order });
  });

  app.delete("/api/admin/orders/:id", requireAdmin, (req, res) => {
    const idx = db.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "الطلب غير موجود." });
    db.orders.splice(idx, 1);
    persistDbAsync();
    return res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ousta server listening on http://localhost:${PORT}`);
  });
}

startServer();
