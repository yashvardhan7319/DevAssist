import * as fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { RepoFile } from "../db";
import { logger } from "../utils/logger";

export class StorageService {
  private static STORAGE_ROOT = path.join(process.cwd(), ".devassist-repos");

  static async init(): Promise<void> {
    try {
      await fs.mkdir(this.STORAGE_ROOT, { recursive: true });
    } catch (error) {
      logger.error("Failed to initialize StorageService", error);
    }
  }

  static async saveFiles(repositoryId: string, files: RepoFile[]): Promise<void> {
    const repoDir = path.join(this.STORAGE_ROOT, repositoryId);
    await fs.mkdir(repoDir, { recursive: true });
    
    for (const file of files) {
      const fullPath = path.join(repoDir, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content, "utf-8");
    }
  }

  static async saveFile(repositoryId: string, filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.STORAGE_ROOT, repositoryId, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
  }

  static async getFileContent(repositoryId: string, filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.STORAGE_ROOT, repositoryId, filePath);
      return await fs.readFile(fullPath, "utf-8");
    } catch (e) {
      return "";
    }
  }

  static async getFiles(repositoryId: string, metadataFiles: {path: string, size: number}[]): Promise<RepoFile[]> {
    const files: RepoFile[] = [];
    for (const meta of metadataFiles) {
      const content = await this.getFileContent(repositoryId, meta.path);
      files.push({
        path: meta.path,
        size: meta.size,
        content
      });
    }
    return files;
  }

  static async deleteFile(repositoryId: string, filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.STORAGE_ROOT, repositoryId, filePath);
      await fs.rm(fullPath, { force: true });
    } catch (e) {}
  }

  static async deleteRepository(repositoryId: string): Promise<void> {
    try {
      const repoDir = path.join(this.STORAGE_ROOT, repositoryId);
      await fs.rm(repoDir, { recursive: true, force: true });
    } catch (e) {}
  }

  // Fallback for synchronous seeding (db.ts legacy user creation)
  static saveFilesSync(repositoryId: string, files: RepoFile[]): void {
    const repoDir = path.join(this.STORAGE_ROOT, repositoryId);
    fsSync.mkdirSync(repoDir, { recursive: true });
    
    for (const file of files) {
      const fullPath = path.join(repoDir, file.path);
      fsSync.mkdirSync(path.dirname(fullPath), { recursive: true });
      fsSync.writeFileSync(fullPath, file.content, "utf-8");
    }
  }
}
