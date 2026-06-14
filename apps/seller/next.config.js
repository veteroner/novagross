/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@novagross/ui', '@novagross/utils', '@novagross/database', '@novagross/cargo'],
  images: {
    domains: ['via.placeholder.com', 'yditeqzqqwqiywoaftfr.supabase.co'],
  },
  experimental: {
    // iyzipay paket klasöründen runtime'da JSON kaynaklarını okur — bundle'a dahil etme
    serverComponentsExternalPackages: ['iyzipay'],
  },
}

module.exports = nextConfig
