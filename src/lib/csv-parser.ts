/**
 * Lightweight, robust CSV parser and template generator.
 * Supports quotes ("..."), commas, semicolons, and CRLF/LF newlines.
 */

export interface PropertyImportRow {
  kode?: string;
  tipe?: string;
  kecamatan: string;
  kawasan?: string;
  alamat: string;
  luas_tanah?: string | number;
  luas_bangunan?: string | number;
  kamar_tidur?: string | number;
  kamar_mandi?: string | number;
  lantai?: string | number;
  sertifikat?: string;
  daya_listrik?: string | number;
  arah_hadap?: string;
  harga_penawaran?: string | number;
  nama_owner?: string;
  telepon_owner?: string;
  catatan_internal?: string;
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let inQuotes = false;

  // Normalize newlines
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === "," || char === ";") {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if (char === "\n") {
        currentRow.push(currentVal.trim());
        if (currentRow.some((col) => col.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
  }

  // Push last value if present
  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((col) => col.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return [];

  // First line as headers (lowercased & trimmed)
  const headers = lines[0].map((h) =>
    h
      .toLowerCase()
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
  );

  const results: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = row[idx] !== undefined ? row[idx] : "";
    });
    results.push(record);
  }

  return results;
}

export function generatePropertyImportTemplate(): string {
  const headers = [
    "kode",
    "tipe",
    "kecamatan",
    "kawasan",
    "alamat",
    "luas_tanah",
    "luas_bangunan",
    "kamar_tidur",
    "kamar_mandi",
    "lantai",
    "sertifikat",
    "daya_listrik",
    "arah_hadap",
    "harga_penawaran",
    "nama_owner",
    "telepon_owner",
    "catatan_internal",
  ];

  const sampleRows = [
    [
      "JS-SAMPLE-01",
      "Rumah",
      "Kebayoran Baru",
      "Kemang",
      "Jl. Kemang Raya No. 18, Jakarta Selatan",
      "400",
      "550",
      "5",
      "4",
      "2",
      "SHM",
      "7700",
      "Selatan",
      "18500000000",
      "Bpk. Bambang Soediro",
      "081288991234",
      "Rumah siap huni, full furnished marmer Italia",
    ],
    [
      "",
      "Apartemen",
      "Kebayoran Baru",
      "Senopati",
      "Senopati Suites Tower 2 Lt. 15",
      "180",
      "180",
      "3",
      "2",
      "1",
      "STRATA_TITLE",
      "5500",
      "Utara",
      "8500000000",
      "Ibu Ratna Dewi",
      "08119876543",
      "Private lift view SCBD, unit primary belum pernah dihuni",
    ],
  ];

  const csvLines = [
    headers.join(","),
    ...sampleRows.map((row) =>
      row.map((val) => (val.includes(",") ? `"${val}"` : val)).join(",")
    ),
  ];

  return csvLines.join("\n");
}
