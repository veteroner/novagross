/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@novagross/ui', '@novagross/utils', '@novagross/database'],
  images: {
    domains: ['via.placeholder.com', 'yditeqzqqwqiywoaftfr.supabase.co'],
  },
}

module.exports = nextConfig
