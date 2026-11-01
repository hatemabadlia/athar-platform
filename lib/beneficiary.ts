/**
 * Normalises a beneficiary identifier before keyed hashing (pure, unit-tested).
 * Accepts an Algerian national identification number (NIN, 18 digits) or a phone number.
 * Returns a typed canonical string, or null if it is neither.
 */
import { normalizePhone } from "@/lib/pipeline/text";

export function normalizeBeneficiaryId(raw: string): string | null {
  const digits = raw.replace(/[\s.\-]/g, "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (/^\d{18}$/.test(digits)) return `nin:${digits}`;
  const phone = normalizePhone(digits);
  return phone ? `tel:${phone}` : null;
}
