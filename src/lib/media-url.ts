/** Menghasilkan URL media yang aman dipakai browser. */
export function getMediaUrl(filePath: string): string {
  if (!filePath) return "";

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    try {
      const url = new URL(filePath);
      // R2 Public Development URL dapat bermasalah pada TLS/jaringan tertentu.
      // Arahkan melalui endpoint same-origin yang membaca objek via R2 API.
      if (url.hostname.endsWith(".r2.dev")) {
        const key = url.pathname.replace(/^\/+/, "");
        return key ? `/api/media/${key.split("/").map(encodeURIComponent).join("/")}` : "";
      }
    } catch {
      return filePath;
    }
    return filePath;
  }

  if (filePath.startsWith("/uploads/") || filePath.startsWith("/api/media/")) {
    return filePath;
  }

  return `/uploads/${filePath.replace(/^\/+/, "")}`;
}
