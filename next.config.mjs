/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: true, // ✅ Povolení struktury /app
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/blocked",
        destination: "/blocked.html",
        permanent: true,
      },
      {
        source: "/uspesnarezervace",
        destination: "/uspesnarezervace.html",
        permanent: true,
      },
      {
        source: "/cancel-success",
        destination: "/cancel-success.html",
        permanent: true,
      },
      {
        source: "/cancel-already",
        destination: "/cancel-already.html",
        permanent: true,
      },
      {
        source: "/cancel-error",
        destination: "/cancel-error.html",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;