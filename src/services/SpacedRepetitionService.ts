import { EnglishHubSettings, ReviewCardItem, VocabItem } from '../types';
import { addDaysISO, getDaysDifference, getTodayISO } from '../utils/dateUtils';
import { DataService } from './DataService';
import { VaultScanner } from './VaultScanner';

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export class SpacedRepetitionService {
  private getSettings: () => EnglishHubSettings;
  private dataService: DataService;
  private vaultScanner: VaultScanner;

  constructor(
    getSettings: () => EnglishHubSettings,
    dataService: DataService,
    vaultScanner: VaultScanner
  ) {
    this.getSettings = getSettings;
    this.dataService = dataService;
    this.vaultScanner = vaultScanner;
  }

  public getDueVocabulary(allVocab: VocabItem[]): { due: VocabItem[]; overdue: VocabItem[] } {
    const today = getTodayISO();
    const due: VocabItem[] = [];
    const overdue: VocabItem[] = [];

    for (const v of allVocab) {
      const diff = getDaysDifference(v.nextReview || today, today);
      if (diff >= 0) {
        due.push(v);
        if (diff > 0) {
          overdue.push(v);
        }
      }
    }
    return { due, overdue };
  }

  public getDueReviewCards(): { due: ReviewCardItem[]; overdue: ReviewCardItem[] } {
    const today = getTodayISO();
    const due: ReviewCardItem[] = [];
    const overdue: ReviewCardItem[] = [];

    for (const c of this.dataService.data.reviewCards) {
      const diff = getDaysDifference(c.nextReview || today, today);
      if (diff >= 0) {
        due.push(c);
        if (diff > 0) {
          overdue.push(c);
        }
      }
    }
    return { due, overdue };
  }

  public async gradeVocabularyItem(item: VocabItem, rating: SRSRating): Promise<VocabItem> {
    const settings = this.getSettings();
    const [againDays, goodDays, easyDays] = settings.srsInitialIntervals;
    const today = getTodayISO();

    let interval = item.interval || 0;
    let ease = item.ease || settings.srsStartingEase;
    let reps = item.reps || 0;
    let lapses = item.lapses || 0;
    let status = item.status;

    if (rating === 'again') {
      reps = 0;
      lapses += 1;
      interval = againDays;
      ease = Math.max(1.3, ease - 0.2);
      status = 'difficult';
    } else if (rating === 'hard') {
      reps += 1;
      interval = Math.max(1, Math.round(interval === 0 ? 1 : interval * 1.2));
      ease = Math.max(1.3, ease - 0.15);
      status = lapses > 1 ? 'difficult' : 'learning';
    } else if (rating === 'good') {
      reps += 1;
      if (reps === 1) interval = goodDays;
      else if (reps === 2) interval = Math.max(goodDays + 1, goodDays * 2);
      else interval = Math.round(interval * ease);
      status = interval >= 21 ? 'mastered' : 'review';
    } else if (rating === 'easy') {
      reps += 1;
      if (reps === 1) interval = easyDays;
      else interval = Math.round((interval || easyDays) * ease * 1.3);
      ease += 0.15;
      status = interval >= 14 ? 'mastered' : 'review';
    }

    const updated: VocabItem = {
      ...item,
      interval,
      ease: Number(ease.toFixed(2)),
      reps,
      lapses,
      status,
      lastReviewed: today,
      nextReview: addDaysISO(today, interval)
    };

    // Update inside customVocab array
    const idx = this.dataService.data.customVocab.findIndex(
      v => v.id === item.id || v.word.toLowerCase() === item.word.toLowerCase()
    );
    if (idx >= 0) {
      this.dataService.data.customVocab[idx] = updated;
    } else {
      this.dataService.data.customVocab.push(updated);
    }

    this.dataService.data.reviewHistory.push({
      date: today,
      itemId: updated.id,
      type: 'vocabulary',
      rating
    });

    await this.vaultScanner.syncVocabSRSBackToFrontmatter(updated);
    await this.dataService.saveLocalDatabase();
    return updated;
  }

  public async gradeReviewCard(card: ReviewCardItem, rating: SRSRating): Promise<ReviewCardItem> {
    const settings = this.getSettings();
    const [againDays, goodDays, easyDays] = settings.srsInitialIntervals;
    const today = getTodayISO();

    let interval = card.interval || 0;
    let ease = card.ease || settings.srsStartingEase;
    let reps = card.reps || 0;
    let lapses = card.lapses || 0;

    if (rating === 'again') {
      reps = 0;
      lapses += 1;
      interval = againDays;
      ease = Math.max(1.3, ease - 0.2);
    } else if (rating === 'hard') {
      reps += 1;
      interval = Math.max(1, Math.round(interval === 0 ? 1 : interval * 1.2));
      ease = Math.max(1.3, ease - 0.15);
    } else if (rating === 'good') {
      reps += 1;
      interval = reps === 1 ? goodDays : Math.round(interval * ease);
    } else if (rating === 'easy') {
      reps += 1;
      interval = reps === 1 ? easyDays : Math.round((interval || easyDays) * ease * 1.3);
      ease += 0.15;
    }

    const updated: ReviewCardItem = {
      ...card,
      interval,
      ease: Number(ease.toFixed(2)),
      reps,
      lapses,
      nextReview: addDaysISO(today, interval)
    };

    const idx = this.dataService.data.reviewCards.findIndex(c => c.id === card.id);
    if (idx >= 0) {
      this.dataService.data.reviewCards[idx] = updated;
    }

    this.dataService.data.reviewHistory.push({
      date: today,
      itemId: updated.id,
      type: updated.type,
      rating
    });

    await this.dataService.saveLocalDatabase();
    return updated;
  }
}
