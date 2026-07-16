/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.twcstorage.ru',
      },
    ],
  },
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
