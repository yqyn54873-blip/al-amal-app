export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function buildWazeNavigateUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat.toFixed(6)},${lng.toFixed(6)}&navigate=yes`;
}

export function buildWazeEmbedUrl(lat: number, lng: number): string {
  return `https://embed.waze.com/iframe?zoom=13&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&pin=1`;
}

export function formatIQD(amount: number): string {
  return `${amount.toLocaleString("en-US")} د.ع`;
}

export function formatIraqWhatsApp(phone: string, message: string): string {
  const cleaned = phone.replace(/\s+/g, "").replace(/^(\+964|00964|0)/, "");
  return `https://wa.me/964${cleaned}?text=${encodeURIComponent(message)}`;
}

export function validateLuhnCard(rawNumber: string): boolean {
  const digits = rawNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}
