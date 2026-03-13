import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [
    process.env.REPLIT_DEV_DOMAIN ?? "",
    `*.${process.env.REPLIT_DEV_DOMAIN ?? ""}`,
  ].filter(Boolean),
};

export default nextConfig;
