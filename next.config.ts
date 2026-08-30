import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "*.discogs.com" },
    ],
    // Uploaded avatars are validated (type + size) at the upload boundary and
    // are meant to render inline (profile pictures), not download as files.
    contentDispositionType: "inline",
  },
};

export default nextConfig;
