/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA config will be added via next-pwa
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
