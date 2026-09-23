import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePropertyListingText } from "@/lib/ai/gemini-parser";
import { getNextPropertyCode } from "@/lib/property-code";
import { checkDuplicateProperties } from "@/lib/duplicate-checker";
import { requireOperationalUser } from "@/lib/api-auth";
import { propertyAccessFilter } from "@/lib/services/property-listing-access";

export async function POST(request: NextRequest) {
  const guard = await requireOperationalUser();
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const rawText = body.text;

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { error: "Teks listing properti tidak boleh kosong." },
        { status: 400 }
      );
    }

    // 1. Ambil data master area & kawasan
    //    Parser dibatasi ke Jabodetabek — 7 ribu kecamatan nasional tidak
    //    muat dalam prompt LLM. Wilayah lain dipilih manual di form.
    const [allKecamatan, kawasanList] = await Promise.all([
      prisma.area.findMany({
        where: { level: 3, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          officialCode: true,
          parent: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.kawasan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, areaId: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const areas = allKecamatan
      .filter((a) => /jakarta|bogor|depok|bekasi|tangerang/i.test(a.parent?.name || ""))
      .map((a) => ({ id: a.id, name: a.name, slug: a.slug, officialCode: a.officialCode }));

    // 2. Ekstraksi dengan AI / Heuristic Parser
    const parsed = await parsePropertyListingText(rawText, areas, kawasanList);

    // Cari areaId yang cocok — tanpa fallback paksa: kalau teks di luar
    // cakupan parser, user memilih area manual di form.
    const matchedArea = areas.find((a) => a.slug === parsed.areaSlug) || null;
    const matchedKawasan = kawasanList.find((k) => k.slug === parsed.kawasanSlug) || null;
    // Broadcast sering hanya menyebut kawasan (mis. Cipete), bukan nama
    // kecamatan administratifnya (Cilandak). Jika kawasan cocok, gunakan
    // kecamatan induk kawasan sebagai fallback agar form dapat langsung disimpan.
    const resolvedArea = matchedArea || (
      matchedKawasan
        ? areas.find((area) => area.id === matchedKawasan.areaId) || null
        : null
    );

    // 3. Generate kode properti: {kode Kemendagri kecamatan}-{running}
    //    Hanya bila area berhasil dikenali.
    const suggestedCode = resolvedArea?.officialCode
      ? await getNextPropertyCode(prisma, {
          kecamatanOfficialCode: resolvedArea.officialCode,
        })
      : null;

    // 4. Deteksi potensi duplikasi (hanya bila area dikenali)
    const duplicates = resolvedArea
      ? await checkDuplicateProperties(prisma, {
          areaId: resolvedArea.id,
          landArea: parsed.landArea,
          buildingArea: parsed.buildingArea,
          address: parsed.address,
          scope: propertyAccessFilter(guard.actor),
        })
      : [];

    return NextResponse.json({
      success: true,
      parsed: {
        ...parsed,
        areaId: resolvedArea?.id ?? null,
        kawasanId: matchedKawasan?.id ?? null,
      },
      suggestedCode,
      duplicates,
      hasDuplicates: duplicates.length > 0,
    });
  } catch (err: unknown) {
    console.error("AI Parse Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses ekstraksi teks properti." },
      { status: 500 }
    );
  }
}
