import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params;
  if (
    !Array.isArray(segments) ||
    segments.length === 0 ||
    segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))
  ) {
    return new Response("Media tidak valid", { status: 400 });
  }

  const r2 = createR2Client();
  if (!r2) return new Response("Storage belum dikonfigurasi", { status: 503 });

  try {
    const key = segments.map(decodeURIComponent).join("/");
    const object = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }));
    if (!object.Body) return new Response("Media tidak ditemukan", { status: 404 });

    const bytes = await object.Body.transformToByteArray();
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": object.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(object.ETag ? { ETag: object.ETag } : {}),
      },
    });
  } catch (error) {
    console.error("R2 media proxy error:", error);
    return new Response("Media tidak ditemukan", { status: 404 });
  }
}
