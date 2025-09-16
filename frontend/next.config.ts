
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude OpenTelemetry packages from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        readline: false,
        inspector: false,
      };
    }

    // Ignore require.extensions warnings for specific modules
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/handlebars\/lib\/index\.js/,
      },
      /require\.extensions is not supported by webpack/,
      /Critical dependency: the request of a dependency is an expression/,
    ];

    // Exclude problematic modules that cause build issues
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'handlebars': 'commonjs handlebars',
      });
    }
    
    config.externals.push({
      '@opentelemetry/exporter-jaeger': 'commonjs @opentelemetry/exporter-jaeger',
      '@opentelemetry/exporter-prometheus': 'commonjs @opentelemetry/exporter-prometheus',
      '@opentelemetry/exporter-zipkin': 'commonjs @opentelemetry/exporter-zipkin',
    });

    return config;
  },
};

export default nextConfig;
