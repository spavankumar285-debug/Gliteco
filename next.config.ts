
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/media": ["./node_modules/ffmpeg-static/**/*"],
  },
};

export default nextConfig;
