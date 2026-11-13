import { App, TFile, normalizePath } from 'obsidian';
import { CEFRLevel, EnglishHubSettings, GrammarCategory, GrammarTopic, VocabItem } from '../types';
import { getTodayISO } from '../utils/dateUtils';
import { DataService } from './DataService';

export class VaultScanner {
  private app: App;
  private getSettings: () => EnglishHubSettings;
  private dataService: DataService;

  constructor(app: App, getSettings: () => EnglishHubSettings, dataService: DataService) {
    this.app = app;
    this.getSettings = getSettings;
    this.dataService = dataService;
  }

  public getAllVocabulary(): VocabItem[] {
    const settings = this.getSettings();
    const fmMap = settings.frontmatterMap;
    const configuredFolders = settings.vocabularyFolders
      .map(f => normalizePath(f.trim()))
      .filter(Boolean);

    const dbPath = this.dataService.getDatabaseFilePath();
    const backupPath = this.dataService.getBackupFilePath();

    const scannedItems = new Map<string, VocabItem>();

    // 1. Load custom/internal vocab first
    for (const item of this.dataService.data.customVocab) {
      scannedItems.set(item.word.toLowerCase(), item);
    }

    // 2. Scan Markdown files in user-configured vocabulary folders
    const markdownFiles = this.app.vault.getMarkdownFiles();
    for (const file of markdownFiles) {
      if (file.path === dbPath || file.path === backupPath) continue;

      const isInVocabFolder = configuredFolders.some(
        folder => file.path === folder || file.path.startsWith(folder + '/')
      );
      if (!isInVocabFolder) continue;

      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;

      const wordVal = fm?.[fmMap.word] ? String(fm[fmMap.word]).trim() : file.basename;
      const key = wordVal.toLowerCase();

      const existing = scannedItems.get(key);
      const meaningVal = fm?.[fmMap.meaning]
        ? String(fm[fmMap.meaning])
        : (existing?.meaning || 'See linked Markdown note for details.');
      const translationVal = fm?.[fmMap.translation]
        ? String(fm[fmMap.translation])
        : (existing?.translation || '');
      const exampleVal = fm?.[fmMap.example]
        ? String(fm[fmMap.example])
        : (existing?.example || '');
      const levelRaw = String(fm?.[fmMap.level] || existing?.level || settings.currentLevel).toUpperCase();
      const validLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const levelVal: CEFRLevel = validLevels.includes(levelRaw as CEFRLevel)
        ? (levelRaw as CEFRLevel)
        : settings.currentLevel;

      const categoryVal = fm?.[fmMap.category]
        ? String(fm[fmMap.category])
        : (existing?.category || 'General');

      const rawStatus = String(fm?.[fmMap.status] || existing?.status || 'new').toLowerCase();
      const validStatuses = ['new', 'learning', 'review', 'difficult', 'mastered'];
      const statusVal = (validStatuses.includes(rawStatus) ? rawStatus : 'new') as VocabItem['status'];

      const nextReviewVal = fm?.[fmMap.nextReview]
        ? String(fm[fmMap.nextReview]).slice(0, 10)
        : (existing?.nextReview || getTodayISO());

      const intervalVal = Number(fm?.[fmMap.interval] ?? existing?.interval ?? 0);
      const easeVal = Number(fm?.[fmMap.ease] ?? existing?.ease ?? settings.srsStartingEase);
      const repsVal = Number(fm?.[fmMap.reps] ?? existing?.reps ?? 0);
      const lapsesVal = Number(fm?.[fmMap.lapses] ?? existing?.lapses ?? 0);

      scannedItems.set(key, {
        id: existing?.id || `vault-${file.path}`,
        word: wordVal,
        meaning: meaningVal,
        translation: translationVal,
        example: exampleVal,
        relatedGrammar: existing?.relatedGrammar || '',
        level: levelVal,
        category: categoryVal,
        status: statusVal,
        filePath: file.path,
        nextReview: nextReviewVal,
        interval: intervalVal,
        ease: easeVal,
        reps: repsVal,
        lapses: lapsesVal,
        lastReviewed: existing?.lastReviewed
      });
    }

    return Array.from(scannedItems.values());
  }

  public getAllGrammarTopics(): GrammarTopic[] {
    const settings = this.getSettings();
    const configuredFolders = settings.grammarFolders
      .map(f => normalizePath(f.trim()))
      .filter(Boolean);

    const topicsMap = new Map<string, GrammarTopic>();
    for (const topic of this.dataService.data.grammarTopics) {
      topicsMap.set(topic.title.toLowerCase(), topic);
    }

    const dbPath = this.dataService.getDatabaseFilePath();
    const markdownFiles = this.app.vault.getMarkdownFiles();

    for (const file of markdownFiles) {
      if (file.path === dbPath) continue;
      const isInGrammarFolder = configuredFolders.some(
        folder => file.path === folder || file.path.startsWith(folder + '/')
      );
      if (!isInGrammarFolder) continue;

      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      const title = fm?.title ? String(fm.title) : file.basename;
      const key = title.toLowerCase();

      const existing = topicsMap.get(key);
      const completed = fm?.completed !== undefined ? Boolean(fm.completed) : (existing?.completed ?? false);
      const progress = fm?.progress !== undefined ? Number(fm.progress) : (completed ? 100 : (existing?.progress ?? 50));

      const rawCategory = String(fm?.category || existing?.category || 'Tenses') as GrammarCategory;
      const rawLevel = String(fm?.level || existing?.level || settings.currentLevel).toUpperCase() as CEFRLevel;

      topicsMap.set(key, {
        id: existing?.id || `gram-${file.path}`,
        title,
        category: rawCategory,
        level: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(rawLevel) ? rawLevel : 'B2',
        completed,
        notePath: file.path,
        progress: Math.max(0, Math.min(100, progress))
      });
    }

    return Array.from(topicsMap.values());
  }

  public async syncVocabSRSBackToFrontmatter(item: VocabItem): Promise<void> {
    if (!item.filePath) return;
    const abstractFile = this.app.vault.getAbstractFileByPath(item.filePath);
    if (!abstractFile || !(abstractFile instanceof TFile)) return;

    const fmMap = this.getSettings().frontmatterMap;
    try {
      await this.app.fileManager.processFrontMatter(abstractFile, (frontmatter) => {
        frontmatter[fmMap.status] = item.status;
        frontmatter[fmMap.nextReview] = item.nextReview;
        frontmatter[fmMap.interval] = item.interval;
        frontmatter[fmMap.ease] = item.ease;
        frontmatter[fmMap.reps] = item.reps;
        frontmatter[fmMap.lapses] = item.lapses;
      });
    } catch (e) {
      console.warn('English Hub: Could not update frontmatter for', item.filePath, e);
    }
  }
}
