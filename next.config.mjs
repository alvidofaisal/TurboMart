/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: true,
    inlineCss: true,
    reactCompiler: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Special configuration for handling problematic routes
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config, { isServer }) => {
    // Only add these fallbacks for client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Provide empty module implementations for Node.js modules
        fs: 'empty-module',
        path: 'path-browserify',
        dns: 'empty-module',
        stream: 'stream-browserify',
        string_decoder: 'string_decoder',
        pg: 'empty-module',
        'pg-connection-string': 'empty-module',
        net: 'empty-module',
        tls: 'empty-module',
        crypto: 'crypto-browserify',
        child_process: 'empty-module',
        util: 'util',
        os: 'os-browserify/browser',
        http: 'stream-http',
        https: 'https-browserify',
        buffer: 'buffer/',
        zlib: 'browserify-zlib',
        assert: 'assert/',
        url: 'url/'
      };
      
      // Add fallback for Node.js global
      config.externals = [...(config.externals || []), { "pg-native": "pg-native" }];
    }
    return config;
  },
  images: {
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bevgyjm5apuichhj.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/insights/vitals.js",
        destination:
          "https://cdn.vercel-insights.com/v1/speed-insights/script.js",
      },
      {
        source: "/insights/events.js",
        destination: "https://cdn.vercel-insights.com/v1/script.js",
      },
      {
        source: "/hfi/events/:slug*",
        destination:
          "https://vitals.vercel-insights.com/v1/:slug*?dsn=KD0ni5HQVdxsHAF2tqBECObqH",
      },
      {
        source: "/hfi/vitals",
        destination:
          "https://vitals.vercel-insights.com/v2/vitals?dsn=fsGnK5U2NRPzYx0Gch0g5w5PxT1",
      },
    ];
  },
};

export default nextConfig;
