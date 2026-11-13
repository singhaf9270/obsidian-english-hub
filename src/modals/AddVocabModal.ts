import { App, Modal, Notice, Setting } from 'obsidian';
import { DataService } from '../services/DataService';
import { CEFRLevel, VocabItem } from '../types';
import { getTodayISO } from '../utils/dateUtils';

export class AddVocabModal extends Modal {
  private dataService: DataService;
  private defaultLevel: CEFRLevel;
  private onSaved: () => void;

  private word = '';
  private meaning = '';
  private translation = '';
  private example = '';
  private relatedGrammar = '';
  private category = 'General';
  private level: CEFRLevel;
  private createMarkdownFile = true;

  constructor(app: App, dataService: DataService, defaultLevel: CEFRLevel, onSaved: () => void) {
    super(app);
    this.dataService = dataService;
    this.defaultLevel = defaultLevel;
    this.level = defaultLevel;
    this.onSaved = onSaved;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Add New Vocabulary Word' });

    new Setting(contentEl).setName('Word or Phrase').addText(t =>
      t.setPlaceholder('e.g., Serendipity').onChange(v => (this.word = v.trim()))
    );

    new Setting(contentEl).setName('English Meaning').addText(t =>
      t.setPlaceholder('Clear definition in English').onChange(v => (this.meaning = v.trim()))
    );

    new Setting(contentEl)
      .setName('Translation (Persian / Native Language)')
      .setDesc('Supports RTL Persian script automatically.')
      .addText(t => t.setPlaceholder('معنی فارسی یا ترجمه').onChange(v => (this.translation = v.trim())));

    new Setting(contentEl).setName('Example Sentence').addTextArea(t =>
      t.setPlaceholder('Write a natural sentence using this word...').onChange(v => (this.example = v.trim()))
    );

    new Setting(contentEl).setName('Related Grammar / Collocations').addText(t =>
      t.setPlaceholder('e.g., Noun [U], collocation: pure serendipity').onChange(v => (this.relatedGrammar = v.trim()))
    );

    new Setting(contentEl).setName('Category').addText(t =>
      t
        .setValue(this.category)
        .setPlaceholder('Academic, Idioms, Daily, Business...')
        .onChange(v => (this.category = v.trim() || 'General'))
    );

    new Setting(contentEl).setName('CEFR Level').addDropdown(d =>
      d
        .addOptions({ A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1', C2: 'C2' })
        .setValue(this.level)
        .onChange(v => (this.level = v as CEFRLevel))
    );

    new Setting(contentEl)
      .setName('Create Markdown note in Vocabulary folder')
      .setDesc('Creates a dedicated .md file with YAML frontmatter in your primary vocabulary folder.')
      .addToggle(t => t.setValue(this.createMarkdownFile).onChange(v => (this.createMarkdownFile = v)));

    new Setting(contentEl)
      .addButton(btn =>
        btn
          .setButtonText('Save Vocabulary')
          .setCta()
          .onClick(async () => {
            if (!this.word || !this.meaning) {
              new Notice('Please enter both a word and its meaning.');
              return;
            }
            const newItem: VocabItem = {
              id: `vocab-${Date.now()}`,
              word: this.word,
              meaning: this.meaning,
              translation: this.translation,
              example: this.example,
              relatedGrammar: this.relatedGrammar,
              level: this.level,
              category: this.category,
              status: 'new',
              filePath: '',
              nextReview: getTodayISO(),
              interval: 0,
              ease: 2.5,
              reps: 0,
              lapses: 0
            };

            if (this.createMarkdownFile) {
              newItem.filePath = await this.dataService.createVocabularyMarkdownNote(newItem);
            }

            this.dataService.data.customVocab.unshift(newItem);
            await this.dataService.saveLocalDatabase();
            new Notice(`Added "${this.word}" to Vocabulary Center.`);
            this.onSaved();
            this.close();
          })
      )
      .addButton(btn => btn.setButtonText('Cancel').onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
