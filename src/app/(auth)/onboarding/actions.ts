"use server";

import { getAccountAccess } from "@/lib/broker-workspace-access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const onboardingSchema = z.object({
  brokerType: z.enum(["INDEPENDENT", "AGENCY_OWNER", "AGENCY_MEMBER"]),
  phone: z.string().trim().min(8).max(40),
  city: z.string().trim().min(2).max(120),
  province: z.string().trim().min(2).max(120),
  licenseNumber: z.string().trim().max(120).optional(),
});

export async function submitBrokerOnboarding(formData: FormData) {
  const access = await getAccountAccess();
  if (access.kind === "unauthenticated") redirect("/login");
  if (access.kind === "member") redirect("/daftar-broker");
  if (access.kind === "staff" || access.kind === "broker-verified") redirect("/login/redirect");
  if (access.kind !== "broker-incomplete" && access.kind !== "broker-revision") redirect("/onboarding/status");
  if (access.verificationStatus !== "PROFILE_INCOMPLETE" && access.verificationStatus !== "REVISION_REQUIRED") {
    redirect("/onboarding");
  }

  const parsed = onboardingSchema.safeParse({
    brokerType: formData.get("brokerType"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    province: formData.get("province"),
    licenseNumber: formData.get("licenseNumber") || undefined,
  });

  if (!parsed.success) redirect("/onboarding?error=invalid-profile");

  await prisma.brokerProfile.upsert({
    where: { userId: access.user.id },
    update: {
      ...parsed.data,
      verificationStatus: "PENDING_REVIEW",
      onboardingCompletedAt: new Date(),
    },
    create: {
      userId: access.user.id,
      ...parsed.data,
      verificationStatus: "PENDING_REVIEW",
      onboardingCompletedAt: new Date(),
    },
  });

  redirect("/onboarding?submitted=1");
}
