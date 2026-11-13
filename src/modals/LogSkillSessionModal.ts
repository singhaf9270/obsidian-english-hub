import { App, Modal, Notice, Setting } from 'obsidian';
import { DataService } from '../services/DataService';
import { SkillCategory } from '../types';
import { getTodayISO } from '../utils/dateUtils';

export class LogSkillSessionModal extends Modal {
  private dataService: DataService;
  private skill: SkillCategory;
  private onSaved: () => void;

  private title = '';
  private resourceOrTopic = '';
  private durationMinutes = 30;
  private notes = '';
  private correctionsOrExpressions = '';

  constructor(app: App, dataService: DataService, skill: SkillCategory, onSaved: () => void) {
    super(app);
    this.dataService = dataService;
    this.skill = skill;
    this.onSaved = onSaved;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    const capSkill = this.skill.charAt(0).toUpperCase() + this.skill.slice(1);
    contentEl.createEl('h2', { text: `Log ${capSkill} Session` });

    new Setting(contentEl)
      .setName('Session Title')
      .addText(t =>
        t.setPlaceholder(`e.g., ${capSkill} Practice`).onChange(v => (this.title = v.trim()))
      );

    new Setting(contentEl)
      .setName(
        this.skill === 'reading'
          ? 'Book / Article Title'
          : this.skill === 'listening'
          ? 'Podcast / Video / Audio Source'
          : this.skill === 'speaking'
          ? 'Speaking Topic / Partner / Prompt'
          : 'Essay Prompt / Paragraph Topic'
      )
      .addText(t =>
        t.setPlaceholder('Enter resource or topic...').onChange(v => (this.resourceOrTopic = v.trim()))
      );

    new Setting(contentEl)
      .setName('Duration (minutes)')
      .addText(t =>
        t
          .setValue(String(this.durationMinutes))
          .onChange(v => (this.durationMinutes = Math.max(1, parseInt(v, 10) || 15)))
      );

    new Setting(contentEl)
      .setName(
        this.skill === 'reading'
          ? 'Comprehension Notes'
          : this.skill === 'listening'
          ? 'Key Takeaways & Summary'
          : this.skill === 'speaking'
          ? 'Recorded Practice & Pronunciation Notes'
          : 'Writing Draft / Summary'
      )
      .addTextArea(t => t.setPlaceholder('Add your session notes...').onChange(v => (this.notes = v.trim())));

    new Setting(contentEl)
      .setName(
        this.skill === 'writing'
          ? 'Grammar Corrections & Feedback'
          : 'Difficult Words, Expressions, or Pronunciation Targets'
      )
      .addTextArea(t =>
        t
          .setPlaceholder('Notable corrections, idioms, or expressions encountered...')
          .onChange(v => (this.correctionsOrExpressions = v.trim()))
      );

    new Setting(contentEl)
      .addButton(btn =>
        btn
          .setButtonText('Save Session')
          .setCta()
          .onClick(async () => {
            if (!this.title) {
              new Notice('Please enter a session title.');
              return;
            }
            this.dataService.data.sessions.unshift({
              id: `sess-${Date.now()}`,
              date: getTodayISO(),
              timestamp: Date.now(),
              category: this.skill,
              durationMinutes: this.durationMinutes,
              title: this.title,
              resourceOrTopic: this.resourceOrTopic || 'General Practice',
              notes: this.notes,
              correctionsOrExpressions: this.correctionsOrExpressions
            });
            await this.dataService.saveLocalDatabase();
            new Notice(`Logged ${this.durationMinutes}m ${this.skill} session!`);
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
