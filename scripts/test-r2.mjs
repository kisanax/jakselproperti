import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const requiredVariables = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];

const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missingVariables.length > 0) {
  console.error(`R2 test failed: missing ${missingVariables.join(", ")}`);
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 1,
    }),
  );

  let publicUrlStatus = null;
  try {
    const publicResponse = await fetch(process.env.R2_PUBLIC_URL, {
      method: "HEAD",
      redirect: "manual",
    });
    publicUrlStatus = publicResponse.status;
  } catch {
    publicUrlStatus = "unreachable";
  }

  console.log(
    JSON.stringify({
      ok: true,
      bucket: process.env.R2_BUCKET_NAME,
      bucketReachable: true,
      objectCountReturned: result.KeyCount ?? 0,
      hasMoreObjects: Boolean(result.IsTruncated),
      publicUrlStatus,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      name: error?.name ?? "Error",
      code: error?.Code ?? error?.code ?? null,
      status: error?.$metadata?.httpStatusCode ?? null,
      message: error?.message ?? "Unknown R2 error",
    }),
  );
  process.exit(1);
} finally {
  client.destroy();
}
