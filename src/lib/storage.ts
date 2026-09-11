import { promises as fs } from "fs";
import path from "path";

// =============================================================================
// Storage Abstraction Layer
// Switch between local filesystem (dev) and Cloudflare R2 (prod)
// =============================================================================

export interface UploadResult {
  filePath: string; // relative path stored in DB
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
    const fullPath = path.join(this.basePath, filePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File might not exist, that's ok
      console.warn(`File not found for deletion: ${fullPath}`);
    }
  }

  getUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }
}

// =============================================================================
// CLOUDFLARE R2 STORAGE (Production — placeholder)
// =============================================================================

class R2Storage implements StorageProvider {
  async upload(file: Buffer, fileName: string, folder: string, mimeType: string): Promise<UploadResult> {
    // TODO: Implement R2 upload using S3-compatible API
    // @aws-sdk/client-s3 with R2 endpoint
    throw new Error("R2 storage not yet implemented. Set STORAGE_PROVIDER=local for development.");
  }

  async delete(filePath: string): Promise<void> {
    // TODO: Implement R2 delete
    throw new Error("R2 storage not yet implemented.");
  }

  getUrl(filePath: string): string {
    const publicUrl = process.env.R2_PUBLIC_URL || "";
    return `${publicUrl}/${filePath}`;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const provider = process.env.STORAGE_PROVIDER || "local";

    switch (provider) {
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
