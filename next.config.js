/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable TypeScript checks during build
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
