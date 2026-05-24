/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@novagross/ui', '@novagross/utils', '@novagross/database'],
  images: {
    domains: ['via.placeholder.com', 'mdyecmjlxswprbpdtohg.supabase.co'],
  },
}

module.exports = nextConfig
