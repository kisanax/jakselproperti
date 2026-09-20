import type { DefaultSession } from "next-auth";
import type { PlatformRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    platformRole: PlatformRole;
  }

  interface Session {
    user: {
      id: string;
      platformRole: PlatformRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    platformRole?: PlatformRole;
  }
}
