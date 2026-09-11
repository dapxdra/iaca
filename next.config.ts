import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // La bitácora adjunta fotos (hasta 4 × 5MB) y CSV (hasta 2 × 10MB) en el
      // mismo submit — ver src/services/storage.service.ts para los límites
      // reales que se validan por archivo. El default de Next (1MB) los corta.
      bodySizeLimit: "45mb",
    },
  },
};

export default nextConfig;
