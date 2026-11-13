import { App, Modal, Notice } from 'obsidian';
import { SRSRating, SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { ReviewCardItem, VocabItem } from '../types';
import { containsPersianOrArabic } from '../utils/domUtils';

type UnifiedReviewEntry =
  | { kind: 'vocab'; item: VocabItem }
  | { kind: 'card'; item: ReviewCardItem };

export class NativeReviewModal extends Modal {
  private queue: UnifiedReviewEntry[];
  private srsService: SpacedRepetitionService;
  private onComplete: () => void;
  private currentIndex = 0;
  private isAnswerShown = false;

  constructor(
    app: App,
    queue: UnifiedReviewEntry[],
    srsService: SpacedRepetitionService,
    onComplete: () => void
  ) {
    super(app);
    this.queue = queue;
    this.srsService = srsService;
    this.onComplete = onComplete;
  }

  onOpen(): void {
    this.renderCurrentCard();
  }

  private renderCurrentCard(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('eh-review-modal');

    if (this.currentIndex >= this.queue.length) {
      const doneBox = contentEl.createDiv({ cls: 'eh-review-complete' });
      doneBox.createEl('h2', { text: 'Review Session Complete!' });
      doneBox.createEl('p', {
        text: `You reviewed ${this.queue.length} item(s). Your spaced-repetition intervals have been updated.`
      });
      const closeBtn = doneBox.createEl('button', { text: 'Return to English Hub', cls: 'mod-cta' });
      closeBtn.addEventListener('click', () => {
        this.close();
      });
      return;
    }

    const current = this.queue[this.currentIndex];
    const header = contentEl.createDiv({ cls: 'eh-review-modal-header' });
    header.createSpan({
      text: `Card ${this.currentIndex + 1} of ${this.queue.length}`,
      cls: 'eh-badge'
    });
    header.createSpan({
      text: current.kind === 'vocab' ? `Vocabulary (${current.item.level})` : current.item.type.toUpperCase(),
      cls: 'eh-badge eh-badge-accent'
    });

    const cardBox = contentEl.createDiv({ cls: 'eh-flashcard-box' });

    if (current.kind === 'vocab') {
      cardBox.createEl('h2', { text: current.item.word, cls: 'eh-flashcard-prompt' });
      cardBox.createEl('p', { text: `Category: ${current.item.category}`, cls: 'eh-muted' });
    } else {
      cardBox.createEl('h3', { text: current.item.prompt, cls: 'eh-flashcard-prompt' });
    }

    if (!this.isAnswerShown) {
      const showBtn = contentEl.createEl('button', {
        text: 'Show Answer',
        cls: 'mod-cta eh-full-btn'
      });
      showBtn.addEventListener('click', () => {
        this.isAnswerShown = true;
        this.renderCurrentCard();
      });
    } else {
      const answerSection = cardBox.createDiv({ cls: 'eh-flashcard-answer' });
      if (current.kind === 'vocab') {
        answerSection.createEl('p', { text: current.item.meaning, cls: 'eh-answer-main' });
        if (current.item.translation) {
          const transEl = answerSection.createEl('p', {
            text: current.item.translation,
            cls: 'eh-answer-translation'
          });
          if (containsPersianOrArabic(current.item.translation)) {
            transEl.setAttribute('dir', 'rtl');
          }
        }
        if (current.item.example) {
          answerSection.createEl('blockquote', { text: current.item.example });
        }
        if (current.item.relatedGrammar) {
          answerSection.createEl('p', { text: current.item.relatedGrammar, cls: 'eh-muted' });
        }
      } else {
        answerSection.createEl('p', { text: current.item.answer, cls: 'eh-answer-main' });
        if (current.item.contextOrExample) {
          answerSection.createEl('blockquote', { text: current.item.contextOrExample });
        }
      }

      const ratingRow = contentEl.createDiv({ cls: 'eh-srs-rating-row' });
      const ratings: { label: string; rating: SRSRating; cls: string }[] = [
        { label: 'Again', rating: 'again', cls: 'eh-btn-again' },
        { label: 'Hard', rating: 'hard', cls: 'eh-btn-hard' },
        { label: 'Good', rating: 'good', cls: 'eh-btn-good' },
        { label: 'Easy', rating: 'easy', cls: 'eh-btn-easy' }
      ];

      for (const r of ratings) {
        const btn = ratingRow.createEl('button', { text: r.label, cls: `eh-srs-btn ${r.cls}` });
        btn.addEventListener('click', async () => {
          if (current.kind === 'vocab') {
            await this.srsService.gradeVocabularyItem(current.item, r.rating);
          } else {
            await this.srsService.gradeReviewCard(current.item, r.rating);
          }
          this.currentIndex += 1;
          this.isAnswerShown = false;
          this.renderCurrentCard();
        });
      }
    }
  }

  onClose(): void {
    this.contentEl.empty();
    this.onComplete();
    new Notice('English Hub: Review progress saved.');
  }
}
