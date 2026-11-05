import type { NextConfig } from "next";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^http/, "ws");

/**
 * Content Security Policy. 'unsafe-inline' for scripts is required by Next's inline bootstrap without
 * nonces; styles need it for Leaflet/Tailwind runtime styles. Third parties are limited to Supabase,
 * map tiles and Cloudflare Turnstile.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.fr ${supabaseUrl}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs} https://tile.openstreetmap.org https://*.tile.openstreetmap.fr https://nominatim.openstreetmap.org https://challenges.cloudflare.com`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      ],
    }, {
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }],
    }];
  },
};

export default nextConfig;
