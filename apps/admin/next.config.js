/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@novagross/ui', '@novagross/utils', '@novagross/database', '@novagross/cargo'],
  images: {
    domains: ['via.placeholder.com', 'yditeqzqqwqiywoaftfr.supabase.co'],
  },
}

module.exports = nextConfig
