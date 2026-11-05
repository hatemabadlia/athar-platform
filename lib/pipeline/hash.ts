import "server-only";
import { createHash, createHmac } from "node:crypto";
import { serverEnv } from "@/lib/env";
import { canonicalText } from "./text";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Content fingerprint of a message (normalised text). Not secret. */
export const contentHash = (text: string) => sha256(canonicalText(text));

/**
 * Keyed hash of a personal identifier (phone, national id). A plain hash of a phone number is
 * trivially reversible by enumeration; an HMAC with a server secret is not.
 */
export const keyedHash = (value: string) =>
  createHmac("sha256", serverEnv().ATHAR_HMAC_SECRET).update(value.trim()).digest("hex");
