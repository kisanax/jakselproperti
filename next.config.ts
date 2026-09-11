import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localDevOrigins = Object.values(networkInterfaces())
  .flatMap((entries) => entries ?? [])
  .filter((entry) => entry.family === "IPv4" && !entry.internal)
  .map((entry) => entry.address);

const nextConfig: NextConfig = {
  // Allow phones on the same Wi-Fi/LAN to load Next.js development assets.
  // Without this, HTML/CSS can render while React client interactions do not
  // hydrate (theme toggle, photo lightbox, and listing preview appear dead).
  // Addresses are detected at server startup so DHCP changes need no code edit.
  allowedDevOrigins: localDevOrigins,
};

export default nextConfig;
