/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
  async redirects() {
    return [
      {
        source: '/holidays',
        destination: '/guide',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
