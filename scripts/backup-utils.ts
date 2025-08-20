import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { gzip, unzip } from 'zlib';
import { createEnhancedLogger } from "@/lib/utils/consola-logger";
import { connectToDatabase } from '../lib/database/connection';
import { Prompt } from '../lib/database/models/prompt';
import { TestCase } from '../lib/database/models/testCase';
import { TestResult } from '../lib/database/models/testResult';
import { PromptMetrics } from '../lib/database/models/promptMetrics';
import { IPrompt, ITestCase, ITestResult, IPromptMetrics } from '../lib/database/types';

const gzipAsync = promisify(gzip);
const unzipAsync = promisify(unzip);

const logger = createEnhancedLogger('backup-utils');

export interface BackupMetadata {
  timestamp: Date;
  version: string;
  collections: {
    prompts: number;
    testCases: number;
    testResults: number;
    promptMetrics: number;
  };
  mongodbUri: string;
  integrity: 'valid' | 'corrupted';
  compressed: boolean;
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    prompts: IPrompt[];
    testCases: ITestCase[];
    testResults: ITestResult[];
    promptMetrics: IPromptMetrics[];
  };
}

export class BackupManager {
  private backupsDir: string;

  constructor(backupsDir: string = 'backups') {
    this.backupsDir = path.resolve(process.cwd(), backupsDir);
  }

  async ensureBackupsDirectory(): Promise<void> {
    try {
      await fs.access(this.backupsDir);
    } catch {
      await fs.mkdir(this.backupsDir, { recursive: true });
      logger.info(`Created backups directory: ${this.backupsDir}`);
    }
  }

  generateBackupFilename(timestamp?: Date): string {
    const date = timestamp || new Date();
    const dateStr = date.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeStr = date.toISOString().split('T')[1].replace(/[:.]/g, '-').slice(0, 8);
    return `backup-${dateStr}-${timeStr}.json`;
  }

  async createBackup(compress: boolean = true): Promise<string> {
    await this.ensureBackupsDirectory();
    await connectToDatabase();

    logger.info('Starting database backup...');

    // Fetch all data
    const [prompts, testCases, testResults, promptMetrics] = await Promise.all([
      Prompt.find({}).lean(),
      TestCase.find({}).lean(),
      TestResult.find({}).lean(),
      PromptMetrics.find({}).lean()
    ]);

    const metadata: BackupMetadata = {
      timestamp: new Date(),
      version: '1.0.0',
      collections: {
        prompts: prompts.length,
        testCases: testCases.length,
        testResults: testResults.length,
        promptMetrics: promptMetrics.length
      },
      mongodbUri: process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@') || 'unknown',
      integrity: 'valid',
      compressed: compress
    };

    const backupData: BackupData = {
      metadata,
      data: {
        prompts: prompts as unknown as IPrompt[],
        testCases: testCases as unknown as ITestCase[],
        testResults: testResults as unknown as ITestResult[],
        promptMetrics: promptMetrics as unknown as IPromptMetrics[]
      }
    };

    // Validate data before saving
    this.validateBackupData(backupData);

    const filename = this.generateBackupFilename(metadata.timestamp);
    const filePath = path.join(this.backupsDir, filename);

    const dataToWrite = JSON.stringify(backupData, null, 2);

    if (compress && dataToWrite.length > 10000) { // Compress if larger than 10KB
      logger.info('Compressing backup data...');
      const compressed = await gzipAsync(Buffer.from(dataToWrite));
      await fs.writeFile(filePath + '.gz', compressed);
      
      logger.info(`Backup created: ${filePath}.gz (compressed: ${this.formatFileSize(compressed.length)})`);
      return filePath + '.gz';
    } else {
      await fs.writeFile(filePath, dataToWrite);
      
      logger.info(`Backup created: ${filePath} (size: ${this.formatFileSize(dataToWrite.length)})`);
      return filePath;
    }
  }

  async loadBackup(filePath: string): Promise<BackupData> {
    const resolvedPath = path.resolve(filePath);
    
    try {
      let fileData: Buffer;
      
      if (filePath.endsWith('.gz')) {
        logger.info('Decompressing backup file...');
        const compressedData = await fs.readFile(resolvedPath);
        fileData = await unzipAsync(compressedData);
      } else {
        fileData = await fs.readFile(resolvedPath);
      }

      const backupData: BackupData = JSON.parse(fileData.toString());
      
      // Validate loaded data
      this.validateBackupData(backupData);
      
      return backupData;
    } catch (error) {
      logger.error({ error, filePath: resolvedPath }, 'Failed to load backup');
      throw new Error(`Failed to load backup from ${resolvedPath}: ${(error as Error).message}`);
    }
  }

  async listBackups(): Promise<Array<{ filename: string; metadata: BackupMetadata; fileSize: number }>> {
    await this.ensureBackupsDirectory();
    
    const files = await fs.readdir(this.backupsDir);
    const backupFiles = files.filter(f => 
      f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.json.gz'))
    ).sort().reverse(); // Most recent first

    const backups: Array<{ filename: string; metadata: BackupMetadata; fileSize: number }> = [];
    
    for (const filename of backupFiles) {
      try {
        const filePath = path.join(this.backupsDir, filename);
        const stats = await fs.stat(filePath);
        
        // Try to read metadata without loading full backup
        const backupData = await this.loadBackup(filePath);
        
        backups.push({
          filename,
          metadata: backupData.metadata,
          fileSize: stats.size
        });
      } catch (error) {
        logger.warn({ filename, error }, 'Skipping corrupted backup file');
        backups.push({
          filename,
          metadata: {
            timestamp: new Date(0),
            version: 'unknown',
            collections: { prompts: 0, testCases: 0, testResults: 0, promptMetrics: 0 },
            mongodbUri: 'unknown',
            integrity: 'corrupted',
            compressed: filename.endsWith('.gz')
          } as BackupMetadata,
          fileSize: 0
        });
      }
    }

    return backups;
  }

  async validateBackupIntegrity(filePath: string): Promise<boolean> {
    try {
      const backupData = await this.loadBackup(filePath);
      this.validateBackupData(backupData);
      return true;
    } catch {
      return false;
    }
  }

  private validateBackupData(backupData: BackupData): void {
    if (!backupData.metadata || !backupData.data) {
      throw new Error('Invalid backup format: missing metadata or data');
    }

    const { metadata, data } = backupData;
    
    if (!metadata.timestamp || !metadata.collections) {
      throw new Error('Invalid backup metadata');
    }

    if (!Array.isArray(data.prompts) || !Array.isArray(data.testCases) || 
        !Array.isArray(data.testResults) || !Array.isArray(data.promptMetrics)) {
      throw new Error('Invalid backup data: collections must be arrays');
    }

    // Verify counts match metadata
    if (data.prompts.length !== metadata.collections.prompts ||
        data.testCases.length !== metadata.collections.testCases ||
        data.testResults.length !== metadata.collections.testResults ||
        data.promptMetrics.length !== metadata.collections.promptMetrics) {
      throw new Error('Backup data integrity check failed: collection counts mismatch');
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  async deleteBackup(filename: string): Promise<void> {
    const filePath = path.join(this.backupsDir, filename);
    await fs.unlink(filePath);
    logger.info(`Deleted backup: ${filename}`);
  }

  async cleanupOldBackups(keepCount: number = 10): Promise<number> {
    const backups = await this.listBackups();
    const validBackups = backups.filter(b => b.metadata.integrity === 'valid');
    
    if (validBackups.length <= keepCount) {
      return 0;
    }

    const toDelete = validBackups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      try {
        await this.deleteBackup(backup.filename);
        deletedCount++;
      } catch (error) {
        logger.warn({ filename: backup.filename, error }, 'Failed to delete old backup');
      }
    }

    logger.info(`Cleaned up ${deletedCount} old backups, keeping ${keepCount} most recent`);
    return deletedCount;
  }
}

export const backupManager = new BackupManager();