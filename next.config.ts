import type { NextConfig } from "next";

// Allow Next/Image to optimize images served from Supabase Storage
// Derive the hostname from NEXT_PUBLIC_SUPABASE_URL when available.
const supabaseHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [
    process.env.REPLIT_DEV_DOMAIN ?? "",
    `*.${process.env.REPLIT_DEV_DOMAIN ?? ""}`,
  ].filter(Boolean),
  images: {
    // Prefer an explicit hostname from env; fallback to all subdomains of supabase.co
    remotePatterns: [
      supabaseHostname
        ? {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          }
        : {
            protocol: "https",
            hostname: "**.supabase.co",
            pathname: "/storage/v1/object/public/**",
          },
    ],
  },
};

export default nextConfig;
