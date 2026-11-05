import type { Wilaya } from "./types";

/**
 * Wilayas 1–58 (Law 84-09 + Law 19-12 of 2019) and 59–69 (2026). Mirrors the `wilayas` table seed
 * (supabase/migrations/*_reference_seed.sql); the database is the source of truth.
 * Wilayas 59–69 (2025–2026 reform, JO n° 40 of 2026 as reported by the press; see
 * supabase/migrations/20261103000100_wilayas_2026.sql) — not yet checked against the JORADP text. Coordinates are approximate chef-lieu positions.
 */

export const WILAYAS: Wilaya[] = [
  { code: 1, name: "Adrar", nameAr: "أدرار", lat: 27.87, lng: -0.29 },
  { code: 2, name: "Chlef", nameAr: "الشلف", lat: 36.17, lng: 1.33 },
  { code: 3, name: "Laghouat", nameAr: "الأغواط", lat: 33.8, lng: 2.87 },
  { code: 4, name: "Oum El Bouaghi", nameAr: "أم البواقي", lat: 35.88, lng: 7.11 },
  { code: 5, name: "Batna", nameAr: "باتنة", lat: 35.56, lng: 6.17 },
  { code: 6, name: "Béjaïa", nameAr: "بجاية", lat: 36.75, lng: 5.07 },
  { code: 7, name: "Biskra", nameAr: "بسكرة", lat: 34.85, lng: 5.73 },
  { code: 8, name: "Béchar", nameAr: "بشار", lat: 31.62, lng: -2.22 },
  { code: 9, name: "Blida", nameAr: "البليدة", lat: 36.47, lng: 2.83 },
  { code: 10, name: "Bouira", nameAr: "البويرة", lat: 36.37, lng: 3.9 },
  { code: 11, name: "Tamanrasset", nameAr: "تمنراست", lat: 22.79, lng: 5.53 },
  { code: 12, name: "Tébessa", nameAr: "تبسة", lat: 35.4, lng: 8.12 },
  { code: 13, name: "Tlemcen", nameAr: "تلمسان", lat: 34.88, lng: -1.32 },
  { code: 14, name: "Tiaret", nameAr: "تيارت", lat: 35.37, lng: 1.32 },
  { code: 15, name: "Tizi Ouzou", nameAr: "تيزي وزو", lat: 36.71, lng: 4.05 },
  { code: 16, name: "Alger", nameAr: "الجزائر", lat: 36.75, lng: 3.06 },
  { code: 17, name: "Djelfa", nameAr: "الجلفة", lat: 34.67, lng: 3.26 },
  { code: 18, name: "Jijel", nameAr: "جيجل", lat: 36.82, lng: 5.77 },
  { code: 19, name: "Sétif", nameAr: "سطيف", lat: 36.19, lng: 5.41 },
  { code: 20, name: "Saïda", nameAr: "سعيدة", lat: 34.83, lng: 0.15 },
  { code: 21, name: "Skikda", nameAr: "سكيكدة", lat: 36.88, lng: 6.9 },
  { code: 22, name: "Sidi Bel Abbès", nameAr: "سيدي بلعباس", lat: 35.19, lng: -0.63 },
  { code: 23, name: "Annaba", nameAr: "عنابة", lat: 36.9, lng: 7.77 },
  { code: 24, name: "Guelma", nameAr: "قالمة", lat: 36.46, lng: 7.43 },
  { code: 25, name: "Constantine", nameAr: "قسنطينة", lat: 36.37, lng: 6.61 },
  { code: 26, name: "Médéa", nameAr: "المدية", lat: 36.27, lng: 2.75 },
  { code: 27, name: "Mostaganem", nameAr: "مستغانم", lat: 35.93, lng: 0.09 },
  { code: 28, name: "M'Sila", nameAr: "المسيلة", lat: 35.7, lng: 4.54 },
  { code: 29, name: "Mascara", nameAr: "معسكر", lat: 35.4, lng: 0.14 },
  { code: 30, name: "Ouargla", nameAr: "ورقلة", lat: 31.95, lng: 5.33 },
  { code: 31, name: "Oran", nameAr: "وهران", lat: 35.7, lng: -0.64 },
  { code: 32, name: "El Bayadh", nameAr: "البيض", lat: 33.68, lng: 1.02 },
  { code: 33, name: "Illizi", nameAr: "إليزي", lat: 26.5, lng: 8.48 },
  { code: 34, name: "Bordj Bou Arréridj", nameAr: "برج بوعريريج", lat: 36.07, lng: 4.76 },
  { code: 35, name: "Boumerdès", nameAr: "بومرداس", lat: 36.77, lng: 3.48 },
  { code: 36, name: "El Tarf", nameAr: "الطارف", lat: 36.77, lng: 8.31 },
  { code: 37, name: "Tindouf", nameAr: "تندوف", lat: 27.67, lng: -8.15 },
  { code: 38, name: "Tissemsilt", nameAr: "تيسمسيلت", lat: 35.61, lng: 1.81 },
  { code: 39, name: "El Oued", nameAr: "الوادي", lat: 33.37, lng: 6.86 },
  { code: 40, name: "Khenchela", nameAr: "خنشلة", lat: 35.43, lng: 7.14 },
  { code: 41, name: "Souk Ahras", nameAr: "سوق أهراس", lat: 36.29, lng: 7.95 },
  { code: 42, name: "Tipaza", nameAr: "تيبازة", lat: 36.59, lng: 2.44 },
  { code: 43, name: "Mila", nameAr: "ميلة", lat: 36.45, lng: 6.26 },
  { code: 44, name: "Aïn Defla", nameAr: "عين الدفلى", lat: 36.26, lng: 1.97 },
  { code: 45, name: "Naâma", nameAr: "النعامة", lat: 33.27, lng: -0.31 },
  { code: 46, name: "Aïn Témouchent", nameAr: "عين تموشنت", lat: 35.3, lng: -1.14 },
  { code: 47, name: "Ghardaïa", nameAr: "غرداية", lat: 32.49, lng: 3.67 },
  { code: 48, name: "Relizane", nameAr: "غليزان", lat: 35.74, lng: 0.56 },
  { code: 49, name: "Timimoun", nameAr: "تيميمون", lat: 29.26, lng: 0.23 },
  { code: 50, name: "Bordj Badji Mokhtar", nameAr: "برج باجي مختار", lat: 21.33, lng: 0.95 },
  { code: 51, name: "Ouled Djellal", nameAr: "أولاد جلال", lat: 34.42, lng: 5.06 },
  { code: 52, name: "Béni Abbès", nameAr: "بني عباس", lat: 30.13, lng: -2.17 },
  { code: 53, name: "In Salah", nameAr: "عين صالح", lat: 27.2, lng: 2.47 },
  { code: 54, name: "In Guezzam", nameAr: "عين قزام", lat: 19.57, lng: 5.77 },
  { code: 55, name: "Touggourt", nameAr: "تقرت", lat: 33.1, lng: 6.06 },
  { code: 56, name: "Djanet", nameAr: "جانت", lat: 24.55, lng: 9.48 },
  { code: 57, name: "El M'Ghair", nameAr: "المغير", lat: 33.95, lng: 5.92 },
  { code: 58, name: "El Meniaa", nameAr: "المنيعة", lat: 30.58, lng: 2.88 },
  { code: 59, name: "Aflou", nameAr: "آفلو", lat: 34.11, lng: 2.1 },
  { code: 60, name: "Barika", nameAr: "بريكة", lat: 35.39, lng: 5.37 },
  { code: 61, name: "El Kantara", nameAr: "القنطرة", lat: 35.22, lng: 5.71 },
  { code: 62, name: "Bir El Ater", nameAr: "بئر العاتر", lat: 34.74, lng: 8.06 },
  { code: 63, name: "El Aricha", nameAr: "العريشة", lat: 34.22, lng: -1.27 },
  { code: 64, name: "Ksar Chellala", nameAr: "قصر الشلالة", lat: 35.21, lng: 2.32 },
  { code: 65, name: "Aïn Oussera", nameAr: "عين وسارة", lat: 35.45, lng: 2.91 },
  { code: 66, name: "Messaad", nameAr: "مسعد", lat: 34.15, lng: 3.5 },
  { code: 67, name: "Ksar El Boukhari", nameAr: "قصر البخاري", lat: 35.89, lng: 2.75 },
  { code: 68, name: "Bou Saâda", nameAr: "بوسعادة", lat: 35.21, lng: 4.17 },
  { code: 69, name: "El Abiodh Sidi Cheikh", nameAr: "الأبيض سيدي الشيخ", lat: 32.9, lng: 0.55 },
];

export const WILAYA_ALIASES: Record<string, number> = {
  "العاصمة": 16,
  "الجزائر العاصمة": 16,
  "الجزائر": 16,
  "مصطفى باشا": 16,
  "باب الوادي": 16,
  "حسين داي": 16,
  "بئر مراد رايس": 16,
  "البليدة": 9,
  "بليدة": 9,
  "بوفاريك": 9,
  "الأربعاء": 9,
  "تيبازة": 42,
  "شرشال": 42,
  "وهران": 31,
  "قسنطينة": 25,
  "عنابة": 23,
  "سطيف": 19,
  "تبسة": 12,
  "باتنة": 5,
  "بجاية": 6,
  "تيزي وزو": 15,
  "بومرداس": 35,
  "ورقلة": 30,
  "غرداية": 47,
  "تلمسان": 13,
  "المدية": 26,
  "جيجل": 18,
  "سكيكدة": 21,
  "بسكرة": 7,
  "الوادي": 39,
  "مستغانم": 27,
  "الشلف": 2,
  "تمنراست": 11,
  "أدرار": 1,
  "بشار": 8,
  "تيارت": 14, "الجلفة": 17, "سعيدة": 20, "سيدي بلعباس": 22, "قالمة": 24, "المسيلة": 28, "معسكر": 29,
  "البيض": 32, "إليزي": 33, "برج بوعريريج": 34, "الطارف": 36, "تندوف": 37, "تيسمسيلت": 38, "خنشلة": 40,
  "سوق أهراس": 41, "ميلة": 43, "عين الدفلى": 44, "النعامة": 45, "عين تموشنت": 46, "غليزان": 48, "البويرة": 10,
  "أم البواقي": 4, "الأغواط": 3, "تيميمون": 49, "برج باجي مختار": 50, "أولاد جلال": 51, "بني عباس": 52,
  "عين صالح": 53, "عين قزام": 54, "تقرت": 55, "جانت": 56, "المغير": 57, "المنيعة": 58,
  "آفلو": 59, "بريكة": 60, "القنطرة": 61, "بئر العاتر": 62, "العريشة": 63, "قصر الشلالة": 64, "عين وسارة": 65, "مسعد": 66, "قصر البخاري": 67, "بوسعادة": 68, "الأبيض سيدي الشيخ": 69, "بو سعادة": 68,
};

export function findWilaya(code: number): Wilaya | undefined {
  return WILAYAS.find((w) => w.code === code);
}

export function detectWilaya(text: string): Wilaya | null {
  const normalized = text.replace(/[إأآ]/g, "ا");
  // Longest alias first to prefer specific matches
  const aliases = Object.entries(WILAYA_ALIASES).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [alias, code] of aliases) {
    const a = alias.replace(/[إأآ]/g, "ا");
    if (normalized.includes(a)) return findWilaya(code) ?? null;
  }
  return null;
}
