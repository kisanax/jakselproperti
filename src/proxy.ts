import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const { pathname } = request.nextUrl;

  if (!request.auth) {
    const loginUrl = new URL("/login", request.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  const role = request.auth.user?.platformRole;
  const isStaff = role === "SUPER_ADMIN" || role === "SUPPORT";

  if (pathname.startsWith("/admin") && role === "MEMBER") {
    return NextResponse.redirect(new URL("/akun", request.nextUrl));
  }

  // Staff (admin) tidak perlu onboarding broker — langsung ke panel admin.
  if (pathname.startsWith("/onboarding") && isStaff) {
    return NextResponse.redirect(new URL("/admin", request.nextUrl));
  }

  if (pathname.startsWith("/admin") && role === "BROKER") {
    const brokerRoutes = [
      "/admin/properties",
      "/admin/listings",
      "/admin/leads",
      "/admin/settings/notifications",
    ];
    const isBrokerRoute =
      pathname === "/admin" || brokerRoutes.some((route) => pathname.startsWith(route));
    if (!isBrokerRoute) {
      return NextResponse.redirect(new URL("/admin", request.nextUrl));
    }
  }

  // Pemeriksaan status verifikasi broker dilakukan terhadap database di layout admin.
  // Proxy hanya melakukan pre-filter role dari session cookie.
  if (
    (pathname.startsWith("/admin/users") || pathname.startsWith("/admin/settings/module-access")) &&
    role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/admin", request.nextUrl));
  }
});

export const config = {
  matcher: ["/admin", "/admin/:path*", "/akun", "/onboarding", "/onboarding/:path*"],
};
