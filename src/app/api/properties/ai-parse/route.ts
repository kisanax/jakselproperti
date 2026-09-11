import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePropertyListingText } from "@/lib/ai/gemini-parser";
import { generatePropertyCode } from "@/lib/area-codes";
import { checkDuplicateProperties } from "@/lib/duplicate-checker";

export async function POST(request: NextRequest) {
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
    const [areas, kawasanList] = await Promise.all([
      prisma.area.findMany({
        where: { level: 1, isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      prisma.kawasan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, areaId: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // 2. Ekstraksi dengan AI / Heuristic Parser
    const parsed = await parsePropertyListingText(rawText, areas, kawasanList);

    // Cari areaId dan kawasanId yang cocok
    const matchedArea = areas.find((a) => a.slug === parsed.areaSlug) || areas[0];
    const matchedKawasan = kawasanList.find((k) => k.slug === parsed.kawasanSlug);

    // 3. Generate kode properti format baru: JS-[KEC]-[NOMOR]
    const suggestedCode = await generatePropertyCode(prisma, matchedArea.slug);

    // 4. Deteksi potensi duplikasi
    const duplicates = await checkDuplicateProperties(prisma, {
      areaId: matchedArea.id,
      landArea: parsed.landArea,
      buildingArea: parsed.buildingArea,
      address: parsed.address,
    });

    return NextResponse.json({
      success: true,
      parsed: {
        ...parsed,
        areaId: matchedArea.id,
        kawasanId: matchedKawasan?.id || null,
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
