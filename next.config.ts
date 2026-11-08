import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      /* Routes retired by the Reading Room redesign; old links stay alive.
         Query params forward, so /shelf?col=Office lands on /?col=Office. */
      { source: "/shelf", destination: "/", permanent: false },
      { source: "/wishlist", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
