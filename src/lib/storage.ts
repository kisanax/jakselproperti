import { promises as fs } from "fs";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// =============================================================================
// Storage Abstraction Layer
// Switch between local filesystem (dev) and Cloudflare R2 (prod)
// =============================================================================

export interface UploadResult {
  filePath: string; // relative path or full URL stored in DB
  url: string; // accessible URL
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface StorageProvider {
  upload(file: Buffer, fileName: string, folder: string, mimeType: string): Promise<UploadResult>;
  delete(filePath: string): Promise<void>;
  getUrl(filePath: string): string;
}

export function getMediaUrl(filePath: string): string {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  if (filePath.startsWith("/uploads/")) {
    return filePath;
  }
  return `/uploads/${filePath}`;
}

// =============================================================================
// LOCAL STORAGE (Development)
// =============================================================================

class LocalStorage implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = path.join(process.cwd(), "public", "uploads");
    this.baseUrl = "/uploads";
  }

  async upload(file: Buffer, fileName: string, folder: string, mimeType: string): Promise<UploadResult> {
    const dirPath = path.join(this.basePath, folder);
    await fs.mkdir(dirPath, { recursive: true });

    // Generate unique filename to prevent collisions
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueName = `${baseName}-${timestamp}${ext}`;

    const filePath = path.join(dirPath, uniqueName);
    await fs.writeFile(filePath, file);

    const relativePath = `${folder}/${uniqueName}`;

    return {
      filePath: relativePath,
      url: `${this.baseUrl}/${relativePath}`,
      fileName: uniqueName,
      fileSize: file.length,
      mimeType,
    };
  }

  async delete(filePath: string): Promise<void> {
    const cleanPath = filePath.replace(/^\/uploads\//, "");
    const fullPath = path.join(this.basePath, cleanPath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File might not exist, that's ok
      console.warn(`File not found for deletion: ${fullPath}`);
    }
  }

  getUrl(filePath: string): string {
    return getMediaUrl(filePath);
  }
}

// =============================================================================
// CLOUDFLARE R2 STORAGE (Production)
// =============================================================================

class R2Storage implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "Missing Cloudflare R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)"
      );
    }

    this.bucket = bucket;
    this.publicUrl = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(file: Buffer, fileName: string, folder: string, mimeType: string): Promise<UploadResult> {
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueName = `${baseName}-${timestamp}${ext}`;
    const cleanFolder = folder.replace(/^\/|\/$/g, "");
    const key = cleanFolder ? `${cleanFolder}/${uniqueName}` : uniqueName;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      })
    );

    const url = this.publicUrl ? `${this.publicUrl}/${key}` : `/${key}`;

    return {
      filePath: url,
      url,
      fileName: uniqueName,
      fileSize: file.length,
      mimeType,
    };
  }

  async delete(filePath: string): Promise<void> {
    let key = filePath;
    if (key.startsWith("http://") || key.startsWith("https://")) {
      try {
        const parsed = new URL(key);
        key = parsed.pathname;
      } catch {
        if (this.publicUrl && key.startsWith(this.publicUrl)) {
          key = key.slice(this.publicUrl.length);
        }
      }
    }
    key = key.replace(/^\//, "");

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (err) {
      console.warn(`R2 delete failed for key ${key}:`, err);
    }
  }

  getUrl(filePath: string): string {
    return getMediaUrl(filePath);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const provider = process.env.STORAGE_PROVIDER || "local";

    switch (provider.toLowerCase()) {
      case "r2":
        storageInstance = new R2Storage();
        break;
      case "local":
      default:
        storageInstance = new LocalStorage();
        break;
    }
  }

  return storageInstance;
}

export default getStorage;
