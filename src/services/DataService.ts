import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import { DEFAULT_LOCAL_DATA } from '../constants';
import { EnglishHubSettings, HubLocalData, VocabItem } from '../types';
import { getTodayISO } from '../utils/dateUtils';

export class DataService {
  private app: App;
  private getSettings: () => EnglishHubSettings;
  public data: HubLocalData;

  constructor(app: App, getSettings: () => EnglishHubSettings) {
    this.app = app;
    this.getSettings = getSettings;
    this.data = JSON.parse(JSON.stringify(DEFAULT_LOCAL_DATA));
  }

  public getDatabaseFilePath(): string {
    const folder = normalizePath(this.getSettings().dataFolderPath || 'EnglishHub');
    return normalizePath(`${folder}/english-hub-database.md`);
  }

  public getBackupFilePath(): string {
    const folder = normalizePath(this.getSettings().dataFolderPath || 'EnglishHub');
    return normalizePath(`${folder}/english-hub-database.backup.md`);
  }

  public async ensureFolderExists(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    const parts = normalized.split('/');
    let current = '';
    for (const part of parts) {
      if (!part) continue;
      current = current ? `${current}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (!existing) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  public async loadLocalDatabase(): Promise<void> {
    try {
      const dbPath = this.getDatabaseFilePath();
      const abstractFile = this.app.vault.getAbstractFileByPath(dbPath);
      if (abstractFile && abstractFile instanceof TFile) {
        const content = await this.app.vault.read(abstractFile);
        const parsed = this.extractJsonFromMarkdown(content);
        if (parsed) {
          this.data = this.validateAndMergeData(parsed);
          return;
        }
      }
      // If missing or unreadable, check backup
      const backupFile = this.app.vault.getAbstractFileByPath(this.getBackupFilePath());
      if (backupFile && backupFile instanceof TFile) {
        const backupContent = await this.app.vault.read(backupFile);
        const parsedBackup = this.extractJsonFromMarkdown(backupContent);
        if (parsedBackup) {
          this.data = this.validateAndMergeData(parsedBackup);
          new Notice('English Hub: Restored local study data from backup file.');
          await this.saveLocalDatabase();
          return;
        }
      }
      // Initialize fresh database in vault
      this.data = JSON.parse(JSON.stringify(DEFAULT_LOCAL_DATA));
      await this.saveLocalDatabase();
    } catch (error) {
      console.error('English Hub: Error loading database', error);
      new Notice('English Hub: Could not read local database file, using safe defaults.');
    }
  }

  public async saveLocalDatabase(): Promise<void> {
    try {
      const folder = normalizePath(this.getSettings().dataFolderPath || 'EnglishHub');
      await this.ensureFolderExists(folder);

      const dbPath = this.getDatabaseFilePath();
      const existing = this.app.vault.getAbstractFileByPath(dbPath);

      // Create recovery backup before modifying
      if (existing && existing instanceof TFile) {
        const previousContent = await this.app.vault.read(existing);
        const backupPath = this.getBackupFilePath();
        const backupFile = this.app.vault.getAbstractFileByPath(backupPath);
        if (backupFile && backupFile instanceof TFile) {
          await this.app.vault.modify(backupFile, previousContent);
        } else {
          await this.app.vault.create(backupPath, previousContent);
        }
      }

      const mdPayload = this.serializeDataToMarkdown(this.data);
      if (existing && existing instanceof TFile) {
        await this.app.vault.modify(existing, mdPayload);
      } else {
        await this.app.vault.create(dbPath, mdPayload);
      }
    } catch (error) {
      console.error('English Hub: Error saving database', error);
      new Notice('English Hub: Failed to save local database.');
    }
  }

  private serializeDataToMarkdown(data: HubLocalData): string {
    const jsonString = JSON.stringify(data, null, 2);
    return [
      '---',
      'plugin: english-hub',
      `version: ${data.version}`,
      `last_updated: "${new Date().toISOString()}"`,
      '---',
      '# English Hub Local Database',
      '',
      '> This file is automatically managed by the **English Hub** plugin to store study sessions, spaced-repetition progress, planner tasks, and analytics locally inside your vault.',
      '',
      '```json',
      jsonString,
      '```',
      ''
    ].join('\n');
  }

  private extractJsonFromMarkdown(md: string): Partial<HubLocalData> | null {
    const match = md.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match || !match[1]) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }

  private validateAndMergeData(raw: Partial<HubLocalData>): HubLocalData {
    return {
      version: typeof raw.version === 'number' ? raw.version : 1,
      hasDismissedWelcome: Boolean(raw.hasDismissedWelcome),
      customVocab: Array.isArray(raw.customVocab) ? raw.customVocab : DEFAULT_LOCAL_DATA.customVocab,
      grammarTopics: Array.isArray(raw.grammarTopics) ? raw.grammarTopics : DEFAULT_LOCAL_DATA.grammarTopics,
      reviewCards: Array.isArray(raw.reviewCards) ? raw.reviewCards : DEFAULT_LOCAL_DATA.reviewCards,
      sessions: Array.isArray(raw.sessions) ? raw.sessions : DEFAULT_LOCAL_DATA.sessions,
      tasks: Array.isArray(raw.tasks) ? raw.tasks : DEFAULT_LOCAL_DATA.tasks,
      wotd: raw.wotd && typeof raw.wotd === 'object' ? {
        ...DEFAULT_LOCAL_DATA.wotd,
        ...raw.wotd
      } : DEFAULT_LOCAL_DATA.wotd,
      reviewHistory: Array.isArray(raw.reviewHistory) ? raw.reviewHistory : []
    };
  }

  public async createVocabularyMarkdownNote(item: VocabItem): Promise<string> {
    const settings = this.getSettings();
    const targetFolder = normalizePath(settings.vocabularyFolders[0] || `${settings.dataFolderPath}/Vocabulary`);
    await this.ensureFolderExists(targetFolder);

    const safeFileName = item.word.replace(/[\\/:*?"<>|]/g, '-').trim();
    const filePath = normalizePath(`${targetFolder}/${safeFileName}.md`);

    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing) {
      new Notice(`Vocabulary note "${safeFileName}.md" already exists. Linking existing note.`);
      return filePath;
    }

    const fm = settings.frontmatterMap;
    const content = [
      '---',
      `${fm.word}: "${item.word.replace(/"/g, '\\"')}"`,
      `${fm.meaning}: "${item.meaning.replace(/"/g, '\\"')}"`,
      `${fm.translation}: "${item.translation.replace(/"/g, '\\"')}"`,
      `${fm.level}: "${item.level}"`,
      `${fm.category}: "${item.category}"`,
      `${fm.status}: "${item.status}"`,
      `${fm.example}: "${item.example.replace(/"/g, '\\"')}"`,
      `${fm.nextReview}: "${item.nextReview}"`,
      `${fm.interval}: ${item.interval}`,
      `${fm.ease}: ${item.ease}`,
      `${fm.reps}: ${item.reps}`,
      `${fm.lapses}: ${item.lapses}`,
      'tags:',
      '  - english-hub/vocabulary',
      '---',
      `# ${item.word}`,
      '',
      `**Meaning:** ${item.meaning}`,
      item.translation ? `**Translation:** ${item.translation}` : '',
      `**CEFR Level:** ${item.level} | **Category:** ${item.category}`,
      '',
      '## Example Sentence',
      `> ${item.example || 'Add an example sentence here.'}`,
      '',
      '## Collocations & Grammar Notes',
      item.relatedGrammar || '- ',
      ''
    ].filter(Boolean).join('\n');

    await this.app.vault.create(filePath, content);
    return filePath;
  }

  public async exportVocabularyCSV(allVocab: VocabItem[]): Promise<string> {
    const folder = normalizePath(this.getSettings().dataFolderPath || 'EnglishHub');
    await this.ensureFolderExists(folder);
    const exportPath = normalizePath(`${folder}/vocabulary-export-${getTodayISO()}.csv`);

    const headers = ['Word', 'Meaning', 'Translation', 'Level', 'Category', 'Status', 'Example', 'NextReview', 'Interval', 'Reps'];
    const escapeCSV = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = allVocab.map(v => [
      v.word, v.meaning, v.translation, v.level, v.category, v.status, v.example, v.nextReview, v.interval, v.reps
    ].map(escapeCSV).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const existing = this.app.vault.getAbstractFileByPath(exportPath);
    if (existing && existing instanceof TFile) {
      await this.app.vault.modify(existing, csvContent);
    } else {
      await this.app.vault.create(exportPath, csvContent);
    }
    return exportPath;
  }

  public async exportSessionsCSV(): Promise<string> {
    const folder = normalizePath(this.getSettings().dataFolderPath || 'EnglishHub');
    await this.ensureFolderExists(folder);
    const exportPath = normalizePath(`${folder}/study-sessions-export-${getTodayISO()}.csv`);

    const headers = ['Date', 'Category', 'DurationMinutes', 'Title', 'ResourceOrTopic', 'Notes'];
    const escapeCSV = (val: string | number) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = this.data.sessions.map(s => [
      s.date, s.category, s.durationMinutes, s.title, s.resourceOrTopic, s.notes
    ].map(escapeCSV).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const existing = this.app.vault.getAbstractFileByPath(exportPath);
    if (existing && existing instanceof TFile) {
      await this.app.vault.modify(existing, csvContent);
    } else {
      await this.app.vault.create(exportPath, csvContent);
    }
    return exportPath;
  }
}
