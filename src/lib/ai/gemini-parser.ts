/**
 * AI & Heuristic Parser untuk Listing Properti dari Pesan WhatsApp
 * Menggunakan Google Gemini Flash jika GEMINI_API_KEY tersedia,
 * dengan Fallback Heuristic Regex lokal Indonesia yang tangguh.
 */

export interface ParsedPropertyData {
  title: string;
  type: "HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE";
  areaSlug: string;
  areaName?: string;
  kawasanSlug?: string | null;
  kawasanName?: string | null;
  address: string;
  landArea?: number | null;
  buildingArea?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  maidBedrooms?: number | null;
  maidBathrooms?: number | null;
  floors?: number | null;
  garages?: number | null;
  carports?: number | null;
  certificateType?: "SHM" | "SHGB" | "SHSRS" | "AJB" | "GIRIK" | "PPJB" | "OTHER" | null;
  facing?: string | null;
  electricity?: number | null;
  waterSource?: string | null;
  askingPrice?: number | null;
  priceNegotiable?: boolean;
  amenitySlugs?: string[];
  description: string;
  internalNotes?: string;
  videoUrl?: string | null;
  videoPlatform?: string | null;
  parsedBy: "GEMINI_AI" | "LOCAL_HEURISTIC";
}

interface AreaRef {
  id: string;
  name: string;
  slug: string;
}

interface KawasanRef {
  id: string;
  name: string;
  slug: string;
  areaId: string;
}

/**
 * Main parser entry point
 */
export async function parsePropertyListingText(
  rawText: string,
  areas: AreaRef[],
  kawasanList: KawasanRef[]
): Promise<ParsedPropertyData> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const aiResult = await callGeminiParser(rawText, apiKey, areas, kawasanList);
      if (aiResult) return aiResult;
    } catch (err) {
      console.warn("Gemini API call failed, falling back to local heuristic parser:", err);
    }
  }

  // Fallback lokal jika API key belum diisi atau jika ada kendala jaringan
  return localHeuristicParser(rawText, areas, kawasanList);
}

/**
 * Memanggil Google Gemini API
 */
async function callGeminiParser(
  rawText: string,
  apiKey: string,
  areas: AreaRef[],
  kawasanList: KawasanRef[]
): Promise<ParsedPropertyData | null> {
  const areaSlugs = areas.map((a) => `${a.slug} (${a.name})`).join(", ");
  const kawasanSlugs = kawasanList.map((k) => `${k.slug} (${k.name})`).join(", ");

  const systemInstruction = `Anda adalah asisten cerdas parser teks properti di Jakarta Selatan.
Tugas Anda adalah membaca pesan teks iklan/broadcast WhatsApp properti yang berantakan, menormalisasi data, dan mengembalikan JSON terstruktur.

Daftar Kecamatan Resmi Jakarta Selatan yang tersedia:
[${areaSlugs}]

Daftar Kawasan Populer yang tersedia:
[${kawasanSlugs}]

Aturan Ekstraksi:
- Tentukan type: HOUSE (Rumah), APARTMENT (Apartemen), LAND (Tanah), SHOPHOUSE (Ruko).
- areaSlug HARUS merupakan salah satu dari slug kecamatan yang tersedia. Jika ada kata Cipete Selatan/Gandaria Selatan/Cilandak, pilih 'cilandak'. Jika Senopati/Gunung/Melawai, pilih 'kebayoran-baru'. Jika Kemang/Bangka, pilih 'mampang-prapatan'. Jika Pondok Indah, pilih 'kebayoran-lama'.
- kawasanSlug: pilih slug kawasan populer jika cocok (misal 'cipete', 'kemang', 'pondok-indah', 'senopati'), jika tidak ada yang cocok set null.
- askingPrice: WAJIB angka murni Rupiah (integer). Contoh: '12,5 M' atau '12.5 Miliar' = 12500000000. '850 jt' = 850000000.
- bedrooms dan bathrooms: angka kamar utama. Jika format '3+1', maka bedrooms = 3, maidBedrooms = 1.
- certificateType: 'SHM', 'SHGB', 'SHSRS', 'AJB', 'GIRIK', 'PPJB', atau 'OTHER'.
- amenitySlugs: array berisi amenities terdeteksi seperti: 'kolam-renang', 'garasi', 'carport', 'taman', 'halaman-belakang', 'parkir-luas', 'ac', 'security-24-jam'.
- title: Buatkan judul listing yang menarik dan elegan (bahasa Indonesia).
- description: Buatkan deskripsi publik yang rapi, profesional, dan persuasif.
- internalNotes: Catat detail spesifikasi unik (seperti full marmer, kondisi nego, dll).`;

  const prompt = `Ekstrak teks listing properti berikut ke JSON:

${rawText}

Balas HANYA dengan JSON murni tanpa markdown triple backticks. Format JSON:
{
  "title": string,
  "type": "HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE",
  "areaSlug": string,
  "kawasanSlug": string | null,
  "address": string,
  "landArea": number | null,
  "buildingArea": number | null,
  "bedrooms": number | null,
  "bathrooms": number | null,
  "maidBedrooms": number | null,
  "maidBathrooms": number | null,
  "floors": number | null,
  "garages": number | null,
  "carports": number | null,
  "certificateType": "SHM" | "SHGB" | "SHSRS" | "AJB" | "GIRIK" | "PPJB" | "OTHER" | null,
  "facing": string | null,
  "electricity": number | null,
  "waterSource": string | null,
  "askingPrice": number | null,
  "priceNegotiable": boolean,
  "amenitySlugs": string[],
  "description": string,
  "internalNotes": string
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error status: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) return null;

  const parsed = JSON.parse(textContent);

  // Pastikan areaSlug valid
  const matchedArea = areas.find((a) => a.slug === parsed.areaSlug) || areas[0];
  const matchedKawasan = kawasanList.find((k) => k.slug === parsed.kawasanSlug);

  return {
    ...parsed,
    areaSlug: matchedArea.slug,
    areaName: matchedArea.name,
    kawasanSlug: matchedKawasan ? matchedKawasan.slug : null,
    kawasanName: matchedKawasan ? matchedKawasan.name : null,
    parsedBy: "GEMINI_AI",
  };
}

/**
 * Fallback Parser Cerdas Berbasis Heuristik & Regex Lokal (Bahasa Indonesia)
 */
export function localHeuristicParser(
  rawText: string,
  areas: AreaRef[],
  kawasanList: KawasanRef[]
): ParsedPropertyData {
  const text = rawText.replace(/\r\n/g, "\n");

  // 1. Tipe Properti
  let type: "HOUSE" | "APARTMENT" | "LAND" | "SHOPHOUSE" = "HOUSE";
  if (/\b(?:apartemen|apartment|kondominium|condo)\b/i.test(text)) {
    type = "APARTMENT";
  } else if (/\b(?:ruko|rukan|shophouse)\b/i.test(text)) {
    type = "SHOPHOUSE";
  } else if (/\b(?:tanah|kavling)\b/i.test(text) && !/\b(?:rumah|bangunan|lb\b|km\b|kamar)\b/i.test(text)) {
    type = "LAND";
  } else {
    type = "HOUSE";
  }

  // 2. Deteksi Lokasi (Area & Kawasan)
  let detectedArea: AreaRef = areas[0] || { id: "1", name: "Cilandak", slug: "cilandak" };
  let detectedKawasan: KawasanRef | null = null;

  const lower = text.toLowerCase();

  // Kawasan check
  if (lower.includes("cipete")) {
    detectedArea = areas.find((a) => a.slug === "cilandak") || detectedArea;
    detectedKawasan = kawasanList.find((k) => k.slug === "cipete") || null;
  } else if (lower.includes("kemang") || lower.includes("bangka")) {
    detectedArea = areas.find((a) => a.slug === "mampang-prapatan") || detectedArea;
    detectedKawasan = kawasanList.find((k) => k.slug === "kemang") || null;
  } else if (lower.includes("pondok indah") || lower.includes("permata hijau")) {
    detectedArea = areas.find((a) => a.slug === "kebayoran-lama") || detectedArea;
    detectedKawasan = kawasanList.find((k) => k.slug === "pondok-indah") || null;
  } else if (lower.includes("senopati") || lower.includes("scbd") || lower.includes("dharmawangsa") || lower.includes("gunung")) {
    detectedArea = areas.find((a) => a.slug === "kebayoran-baru") || detectedArea;
    detectedKawasan = kawasanList.find((k) => k.slug === "senopati") || null;
  } else if (lower.includes("cilandak") || lower.includes("lebak bulus") || lower.includes("fatmawati")) {
    detectedArea = areas.find((a) => a.slug === "cilandak") || detectedArea;
    detectedKawasan = kawasanList.find((k) => k.slug === "cilandak-kawasan") || null;
  } else if (lower.includes("tebet")) {
    detectedArea = areas.find((a) => a.slug === "tebet") || detectedArea;
    detectedKawasan = kawasanList.find((k) => k.slug === "tebet-kawasan") || null;
  } else {
    for (const a of areas) {
      if (lower.includes(a.name.toLowerCase())) {
        detectedArea = a;
        break;
      }
    }
  }

  // 3. Luas Tanah & Luas Bangunan
  let landArea: number | null = null;
  let buildingArea: number | null = null;

  const ltMatch =
    text.match(/(?:luas\s*tanah|lt)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) ||
    text.match(/(\d+)\s*(?:m²|m2)\s*(?:tanah|lt)/i);
  if (ltMatch) {
    landArea = parseInt(ltMatch[1].replace(/[.,].*$/, ""), 10);
  }

  const lbMatch =
    text.match(/(?:luas\s*bangunan|lb)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) ||
    text.match(/(\d+)\s*(?:m²|m2)\s*(?:bangunan|lb)/i);
  if (lbMatch) {
    buildingArea = parseInt(lbMatch[1].replace(/[.,].*$/, ""), 10);
  }

  if (!landArea && !buildingArea) {
    const combinedMatch = text.match(/(?:lt\s*[\/|]\s*lb|luas)?\s*[:=]?\s*(\d+)\s*[\/|]\s*(\d+)/i);
    if (combinedMatch) {
      landArea = parseInt(combinedMatch[1], 10);
      buildingArea = parseInt(combinedMatch[2], 10);
    }
  }

  // 4. Kamar Tidur & Kamar Mandi
  let bedrooms: number | null = null;
  let maidBedrooms: number | null = null;

  // Format 1: "3 Kamar Tidur + 1" atau "3 KT + 1"
  const ktMatch1 = text.match(/(\d+)\s*(?:kamar\s*tidur|kt|bed)\s*(?:\+\s*(\d+))?/i);
  // Format 2: "3 + 1 Kamar Tidur" atau "3+1 KT"
  const ktMatch2 = text.match(/(\d+)\s*\+\s*(\d+)\s*(?:kamar\s*tidur|kt|bed)/i);

  if (ktMatch2) {
    bedrooms = parseInt(ktMatch2[1], 10);
    maidBedrooms = parseInt(ktMatch2[2], 10);
  } else if (ktMatch1) {
    bedrooms = parseInt(ktMatch1[1], 10);
    if (ktMatch1[2]) maidBedrooms = parseInt(ktMatch1[2], 10);
  }

  let bathrooms: number | null = null;
  let maidBathrooms: number | null = null;

  // Format 1: "2 Kamar Mandi + 1" atau "2 KM + 1"
  const kmMatch1 = text.match(/(\d+)\s*(?:kamar\s*mandi|km|bath)\s*(?:\+\s*(\d+))?/i);
  // Format 2: "2 + 1 Kamar Mandi" atau "2+1 KM"
  const kmMatch2 = text.match(/(\d+)\s*\+\s*(\d+)\s*(?:kamar\s*mandi|km|bath)/i);

  if (kmMatch2) {
    bathrooms = parseInt(kmMatch2[1], 10);
    maidBathrooms = parseInt(kmMatch2[2], 10);
  } else if (kmMatch1) {
    bathrooms = parseInt(kmMatch1[1], 10);
    if (kmMatch1[2]) maidBathrooms = parseInt(kmMatch1[2], 10);
  }

  // 5. Jumlah Lantai
  let floors: number | null = null;
  const floorMatch = text.match(/(\d+)\s*(?:lantai|lt\b)/i);
  if (floorMatch) {
    floors = parseInt(floorMatch[1], 10);
  } else if (/1\s*lantai/i.test(text)) {
    floors = 1;
  } else if (/2\s*lantai/i.test(text)) {
    floors = 2;
  } else if (/3\s*lantai/i.test(text)) {
    floors = 3;
  }

  // 6. Garasi & Carport
  let garages: number | null = null;
  const garageMatch = text.match(/garasi\s*(?:muat\s*)?(\d+)/i);
  if (garageMatch) {
    garages = parseInt(garageMatch[1], 10);
  } else if (/garasi/i.test(text)) {
    garages = 1;
  }

  let carports: number | null = null;
  const carportMatch = text.match(/carport\s*(?:muat\s*)?(\d+)/i);
  if (carportMatch) {
    carports = parseInt(carportMatch[1], 10);
  }

  // 7. Sertifikat
  let certificateType: "SHM" | "SHGB" | "SHSRS" | "AJB" | "GIRIK" | "PPJB" | "OTHER" | null = null;
  if (/\b(?:shm|hak\s*milik)\b/i.test(text)) {
    certificateType = "SHM";
  } else if (/\b(?:hgb|shgb)\b/i.test(text)) {
    certificateType = "SHGB";
  } else if (/\b(?:strata|shsrs)\b/i.test(text)) {
    certificateType = "SHSRS";
  } else if (/\bajb\b/i.test(text)) {
    certificateType = "AJB";
  } else if (/\bgirik\b/i.test(text)) {
    certificateType = "GIRIK";
  } else if (/\bppjb\b/i.test(text)) {
    certificateType = "PPJB";
  }

  // 8. Harga Penawaran (Khusus setelah kata harga atau nilai eksplisit Rupiah, BUKAN meter persegi)
  let askingPrice: number | null = null;

  // Cari baris atau potongan teks yang ada kata "harga" atau "price" atau "rp"
  const priceSectionMatch = text.match(/(?:harga|price|dijual\s*sebesar)[\s:=]*([^\n]+)/i);
  const targetPriceText = priceSectionMatch ? priceSectionMatch[1] : text;

  // Cek Miliar (hindari 'm²' atau 'm2')
  const miliarMatch = targetPriceText.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:miliar|milyar|\bm\b)(?![²2])/i);
  if (miliarMatch) {
    const rawVal = parseFloat(miliarMatch[1].replace(",", "."));
    askingPrice = Math.round(rawVal * 1000000000);
  } else {
    // Cek Juta
    const jutaMatch = targetPriceText.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:juta|\bjt\b)/i);
    if (jutaMatch) {
      const rawVal = parseFloat(jutaMatch[1].replace(",", "."));
      askingPrice = Math.round(rawVal * 1000000);
    } else {
      // Cek angka lengkap Rp 12.500.000.000
      const pureNumMatch = targetPriceText.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3}){2,})/i);
      if (pureNumMatch) {
        askingPrice = parseInt(pureNumMatch[1].replace(/\./g, ""), 10);
      }
    }
  }

  const priceNegotiable = /nego|negotiable/i.test(text);

  // 9. Fasilitas / Amenities
  const amenitySlugs: string[] = [];
  if (/pool|kolam\s*renang/i.test(text)) amenitySlugs.push("kolam-renang");
  if (garages && garages > 0) amenitySlugs.push("garasi");
  if (carports && carports > 0) amenitySlugs.push("carport");
  if (/taman|halaman|garden/i.test(text)) {
    amenitySlugs.push("taman");
    amenitySlugs.push("halaman-belakang");
  }
  if (garages && garages >= 4) amenitySlugs.push("parkir-luas");
  if (/\bac\b/i.test(text)) amenitySlugs.push("ac");
  if (/security|satpam|keamanan/i.test(text)) amenitySlugs.push("security-24-jam");

  // 10. Alamat & Judul
  const firstLine = text.split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
  const titleCandidate = firstLine.replace(/^(?:dijual|for\s*sale|fs)[:\s-]*/i, "").trim();
  const locationLabel = detectedKawasan ? detectedKawasan.name : detectedArea.name;
  const title = titleCandidate.length > 5
    ? `Rumah Mewah di ${locationLabel} — ${titleCandidate}`
    : `Rumah Eksklusif di ${locationLabel}, Jakarta Selatan`;

  const address = `${locationLabel}, ${detectedArea.name}, Jakarta Selatan`;

  // 11. Deteksi URL Video Tour (YouTube, Instagram Reels, TikTok)
  let videoUrl: string | null = null;
  let videoPlatform: string | null = null;

  const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    const rawUrl = urlMatch[1].replace(/[.,;!]$/, "");
    if (/youtube\.com|youtu\.be/i.test(rawUrl)) {
      videoUrl = rawUrl;
      videoPlatform = "YOUTUBE";
    } else if (/instagram\.com\/(?:reel|p|tv)/i.test(rawUrl)) {
      videoUrl = rawUrl;
      videoPlatform = "INSTAGRAM";
    } else if (/tiktok\.com/i.test(rawUrl)) {
      videoUrl = rawUrl;
      videoPlatform = "TIKTOK";
    }
  }

  return {
    title,
    type,
    areaSlug: detectedArea.slug,
    areaName: detectedArea.name,
    kawasanSlug: detectedKawasan ? detectedKawasan.slug : null,
    kawasanName: detectedKawasan ? detectedKawasan.name : null,
    address,
    landArea,
    buildingArea,
    bedrooms,
    bathrooms,
    maidBedrooms,
    maidBathrooms,
    floors,
    garages,
    carports,
    certificateType,
    askingPrice,
    priceNegotiable,
    amenitySlugs,
    description: `Hunian istimewa di kawasan strategis ${locationLabel}, Jakarta Selatan.\n` +
      `Spesifikasi: Luas Tanah ${landArea || "-"} m², Luas Bangunan ${buildingArea || "-"} m², ` +
      `${bedrooms || "-"} Kamar Tidur, ${bathrooms || "-"} Kamar Mandi.\n` +
      `Legalitas ${certificateType || "lengkap"}, lingkungan asri dan nyaman.`,
    internalNotes: text.slice(0, 500),
    videoUrl,
    videoPlatform,
    parsedBy: "LOCAL_HEURISTIC",
  };
}
