import type {NextConfig} from "next";

const API_URL = "https://hackathon-app-pjdd7.ondigitalocean.app";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;