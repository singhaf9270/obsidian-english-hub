import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import EnglishHubPlugin from '../main';
import { ConfirmModal } from '../modals/ConfirmModal';
import { QuickActionModal } from '../modals/QuickActionModal';
import { DEFAULT_LOCAL_DATA, DEFAULT_SETTINGS } from '../constants';
import { CEFRLevel } from '../types';

type SettingsSection =
  | 'general'
  | 'dashboard'
  | 'vocabulary'
  | 'review'
  | 'grammar'
  | 'skills'
  | 'planner'
  | 'quick-actions'
  | 'statistics'
  | 'appearance'
  | 'data';

export class EnglishHubSettingTab extends PluginSettingTab {
  private plugin: EnglishHubPlugin;
  private activeSection: SettingsSection = 'general';

  constructor(app: App, plugin: EnglishHubPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('eh-settings-container');

    containerEl.createEl('h2', { text: 'English Hub Settings' });

    const navBar = containerEl.createDiv({ cls: 'eh-settings-nav' });
    const sections: { id: SettingsSection; label: string }[] = [
      { id: 'general', label: 'General' },
      { id: 'dashboard', label: 'Dashboard Layout' },
      { id: 'vocabulary', label: 'Vocabulary' },
      { id: 'review', label: 'Review' },
      { id: 'grammar', label: 'Grammar' },
      { id: 'skills', label: 'Skills & Timer' },
      { id: 'planner', label: 'Study Planner' },
      { id: 'quick-actions', label: 'Quick Actions' },
      { id: 'statistics', label: 'Statistics' },
      { id: 'appearance', label: 'Appearance' },
      { id: 'data', label: 'Data Management' }
    ];

    for (const sec of sections) {
      const btn = navBar.createEl('button', {
        text: sec.label,
        cls: `eh-settings-tab-btn ${this.activeSection === sec.id ? 'is-active' : ''}`
      });
      btn.addEventListener('click', () => {
        this.activeSection = sec.id;
        this.display();
      });
    }

    const bodyEl = containerEl.createDiv({ cls: 'eh-settings-body' });

    switch (this.activeSection) {
      case 'general':
        this.renderGeneral(bodyEl);
        break;
      case 'dashboard':
        this.renderDashboardLayout(bodyEl);
        break;
      case 'vocabulary':
        this.renderVocabulary(bodyEl);
        break;
      case 'review':
        this.renderReview(bodyEl);
        break;
      case 'grammar':
        this.renderGrammar(bodyEl);
        break;
      case 'skills':
        this.renderSkills(bodyEl);
        break;
      case 'planner':
        this.renderPlanner(bodyEl);
        break;
      case 'quick-actions':
        this.renderQuickActions(bodyEl);
        break;
      case 'statistics':
        this.renderStatistics(bodyEl);
        break;
      case 'appearance':
        this.renderAppearance(bodyEl);
        break;
      case 'data':
        this.renderDataManagement(bodyEl);
        break;
    }
  }

  private renderGeneral(el: HTMLElement): void {
    new Setting(el)
      .setName('Current English Level (CEFR)')
      .setDesc('Displayed on your Overview dashboard and used as default for new notes.')
      .addDropdown(d =>
        d
          .addOptions({ A1: 'A1 - Beginner', A2: 'A2 - Elementary', B1: 'B1 - Intermediate', B2: 'B2 - Upper Intermediate', C1: 'C1 - Advanced', C2: 'C2 - Mastery' })
          .setValue(this.plugin.settings.currentLevel)
          .onChange(async val => {
            this.plugin.settings.currentLevel = val as CEFRLevel;
            await this.plugin.saveSettings();
          })
      );

    new Setting(el)
      .setName('Daily Study Target (minutes)')
      .addText(t =>
        t.setValue(String(this.plugin.settings.dailyStudyGoalMinutes)).onChange(async v => {
          this.plugin.settings.dailyStudyGoalMinutes = Math.max(5, parseInt(v, 10) || 45);
          await this.plugin.saveSettings();
        })
      );

    new Setting(el)
      .setName('Weekly Study Target (minutes)')
      .addText(t =>
        t.setValue(String(this.plugin.settings.weeklyStudyGoalMinutes)).onChange(async v => {
          this.plugin.settings.weeklyStudyGoalMinutes = Math.max(15, parseInt(v, 10) || 300);
          await this.plugin.saveSettings();
        })
      );

    new Setting(el)
      .setName('Monthly Study Target (minutes)')
      .addText(t =>
        t.setValue(String(this.plugin.settings.monthlyStudyGoalMinutes)).onChange(async v => {
          this.plugin.settings.monthlyStudyGoalMinutes = Math.max(60, parseInt(v, 10) || 1200);
          await this.plugin.saveSettings();
        })
      );
  }

  private renderDashboardLayout(el: HTMLElement): void {
    new Setting(el)
      .setName('Compact Dashboard Mode')
      .setDesc('Use tighter card padding and compact spacing across the dashboard.')
      .addToggle(t =>
        t.setValue(this.plugin.settings.compactMode).onChange(async v => {
          this.plugin.settings.compactMode = v;
          await this.plugin.saveSettings();
        })
      );

    el.createEl('h4', { text: 'Customize Dashboard Widgets (Visibility & Order)' });
    const sorted = [...this.plugin.settings.widgets].sort((a, b) => a.order - b.order);

    sorted.forEach((w, idx) => {
      new Setting(el)
        .setName(w.title)
        .setDesc(`Order: #${idx + 1}`)
        .addToggle(t =>
          t
            .setTooltip('Show / Hide Widget')
            .setValue(w.visible)
            .onChange(async val => {
              w.visible = val;
              await this.plugin.saveSettings();
            })
        )
        .addExtraButton(btn =>
          btn
            .setIcon('arrow-up')
            .setTooltip('Move Up')
            .onClick(async () => {
              if (idx === 0) return;
              const prev = sorted[idx - 1];
              const temp = w.order;
              w.order = prev.order;
              prev.order = temp;
              await this.plugin.saveSettings();
              this.display();
            })
        )
        .addExtraButton(btn =>
          btn
            .setIcon('arrow-down')
            .setTooltip('Move Down')
            .onClick(async () => {
              if (idx === sorted.length - 1) return;
              const next = sorted[idx + 1];
              const temp = w.order;
              w.order = next.order;
              next.order = temp;
              await this.plugin.saveSettings();
              this.display();
            })
        );
    });
  }

  private renderVocabulary(el: HTMLElement): void {
    new Setting(el)
      .setName('Vocabulary Source Folders (comma-separated)')
      .setDesc('English Hub scans Markdown files inside these folders without requiring format migration.')
      .addText(t =>
        t
          .setValue(this.plugin.settings.vocabularyFolders.join(', '))
          .onChange(async v => {
            this.plugin.settings.vocabularyFolders = v
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    el.createEl('h4', { text: 'Configurable Frontmatter Property Mapping' });
    const fm = this.plugin.settings.frontmatterMap;
    const keys: (keyof typeof fm)[] = ['word', 'meaning', 'translation', 'level', 'category', 'status', 'example', 'nextReview'];

    for (const k of keys) {
      new Setting(el)
        .setName(`Frontmatter key for "${k}"`)
        .addText(t =>
          t.setValue(fm[k]).onChange(async val => {
            fm[k] = val.trim() || k;
            await this.plugin.saveSettings();
          })
        );
    }
  }

  private renderReview(el: HTMLElement): void {
    new Setting(el)
      .setName('Enable Native Spaced Repetition (SM-2)')
      .setDesc('Use English Hub built-in flashcard scheduling alongside third-party review plugins.')
      .addToggle(t =>
        t.setValue(this.plugin.settings.enableNativeSRS).onChange(async v => {
          this.plugin.settings.enableNativeSRS = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(el)
      .setName('Starting Ease Factor')
      .setDesc('Default SM-2 ease multiplier (default: 2.5).')
      .addText(t =>
        t.setValue(String(this.plugin.settings.srsStartingEase)).onChange(async v => {
          this.plugin.settings.srsStartingEase = Math.max(1.3, parseFloat(v) || 2.5);
          await this.plugin.saveSettings();
        })
      );
  }

  private renderGrammar(el: HTMLElement): void {
    new Setting(el)
      .setName('Grammar Notes Folders (comma-separated)')
      .setDesc('Folders containing your existing Markdown grammar notes.')
      .addText(t =>
        t
          .setValue(this.plugin.settings.grammarFolders.join(', '))
          .onChange(async v => {
            this.plugin.settings.grammarFolders = v
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );
  }

  private renderSkills(el: HTMLElement): void {
    el.createEl('h4', { text: 'Weekly Skill Duration Goals (minutes)' });

    new Setting(el).setName('Reading Weekly Goal').addText(t =>
      t.setValue(String(this.plugin.settings.readingGoalMinutesWeekly)).onChange(async v => {
        this.plugin.settings.readingGoalMinutesWeekly = Math.max(10, parseInt(v, 10) || 90);
        await this.plugin.saveSettings();
      })
    );

    new Setting(el).setName('Listening Weekly Goal').addText(t =>
      t.setValue(String(this.plugin.settings.listeningGoalMinutesWeekly)).onChange(async v => {
        this.plugin.settings.listeningGoalMinutesWeekly = Math.max(10, parseInt(v, 10) || 90);
        await this.plugin.saveSettings();
      })
    );

    new Setting(el).setName('Speaking Weekly Goal').addText(t =>
      t.setValue(String(this.plugin.settings.speakingGoalMinutesWeekly)).onChange(async v => {
        this.plugin.settings.speakingGoalMinutesWeekly = Math.max(10, parseInt(v, 10) || 60);
        await this.plugin.saveSettings();
      })
    );

    new Setting(el).setName('Writing Weekly Goal').addText(t =>
      t.setValue(String(this.plugin.settings.writingGoalMinutesWeekly)).onChange(async v => {
        this.plugin.settings.writingGoalMinutesWeekly = Math.max(10, parseInt(v, 10) || 60);
        await this.plugin.saveSettings();
      })
    );

    el.createEl('h4', { text: 'Study Timer Durations (minutes)' });
    new Setting(el).setName('Pomodoro Work Duration').addText(t =>
      t.setValue(String(this.plugin.settings.pomodoroWorkMinutes)).onChange(async v => {
        this.plugin.settings.pomodoroWorkMinutes = Math.max(1, parseInt(v, 10) || 25);
        await this.plugin.saveSettings();
      })
    );
    new Setting(el).setName('Short Break Duration').addText(t =>
      t.setValue(String(this.plugin.settings.pomodoroShortBreakMinutes)).onChange(async v => {
        this.plugin.settings.pomodoroShortBreakMinutes = Math.max(1, parseInt(v, 10) || 5);
        await this.plugin.saveSettings();
      })
    );
    new Setting(el).setName('Long Break Duration').addText(t =>
      t.setValue(String(this.plugin.settings.pomodoroLongBreakMinutes)).onChange(async v => {
        this.plugin.settings.pomodoroLongBreakMinutes = Math.max(1, parseInt(v, 10) || 15);
        await this.plugin.saveSettings();
      })
    );
  }

  private renderPlanner(el: HTMLElement): void {
    el.createEl('p', {
      text: 'Manage daily, weekly, and monthly learning routines directly from the Study Planner tab or reset completed daily routines below.'
    });
    new Setting(el)
      .setName('Reset Daily Routine Tasks')
      .setDesc('Uncheck all recurring daily routine items for a fresh day.')
      .addButton(btn =>
        btn.setButtonText('Reset Daily Routines').onClick(async () => {
          for (const task of this.plugin.dataService.data.tasks) {
            if (task.isRoutine && task.horizon === 'daily') {
              task.completed = false;
            }
          }
          await this.plugin.dataService.saveLocalDatabase();
          this.plugin.refreshOpenViews();
          new Notice('Daily routine checklist reset.');
        })
      );
  }

  private renderQuickActions(el: HTMLElement): void {
    new Setting(el)
      .setName('Add New Quick Action / Plugin Command Button')
      .setDesc('Execute commands from any installed Obsidian plugin via app.commands.executeCommandById().')
      .addButton(btn =>
        btn
          .setButtonText('+ Add Quick Action')
          .setCta()
          .onClick(() => {
            new QuickActionModal(
              this.app,
              this.plugin.commandService,
              null,
              this.plugin.settings.quickActions.length,
              async newAction => {
                this.plugin.settings.quickActions.push(newAction);
                await this.plugin.saveSettings();
                this.display();
              }
            ).open();
          })
      );

    const actions = [...this.plugin.settings.quickActions].sort((a, b) => a.order - b.order);
    actions.forEach((act, index) => {
      new Setting(el)
        .setName(`${act.label} (${act.pluginName})`)
        .setDesc(`Command ID: ${act.commandId}`)
        .addExtraButton(b =>
          b
            .setIcon('pencil')
            .setTooltip('Edit')
            .onClick(() => {
              new QuickActionModal(this.app, this.plugin.commandService, act, act.order, async updated => {
                const idx = this.plugin.settings.quickActions.findIndex(x => x.id === act.id);
                if (idx >= 0) this.plugin.settings.quickActions[idx] = updated;
                await this.plugin.saveSettings();
                this.display();
              }).open();
            })
        )
        .addExtraButton(b =>
          b
            .setIcon('copy')
            .setTooltip('Duplicate')
            .onClick(async () => {
              const copy = {
                ...act,
                id: `qa-${Date.now()}`,
                label: `${act.label} (Copy)`,
                order: actions.length
              };
              this.plugin.settings.quickActions.push(copy);
              await this.plugin.saveSettings();
              this.display();
            })
        )
        .addExtraButton(b =>
          b
            .setIcon('arrow-up')
            .setTooltip('Move Up')
            .onClick(async () => {
              if (index === 0) return;
              const prev = actions[index - 1];
              const tmp = act.order;
              act.order = prev.order;
              prev.order = tmp;
              await this.plugin.saveSettings();
              this.display();
            })
        )
        .addExtraButton(b =>
          b
            .setIcon('trash')
            .setTooltip('Delete')
            .onClick(async () => {
              this.plugin.settings.quickActions = this.plugin.settings.quickActions.filter(x => x.id !== act.id);
              await this.plugin.saveSettings();
              this.display();
            })
        );
    });
  }

  private renderStatistics(el: HTMLElement): void {
    new Setting(el)
      .setName('Enable Gamification & Achievements')
      .setDesc('Show achievement badges, milestones, and streak rewards.')
      .addToggle(t =>
        t.setValue(this.plugin.settings.enableGamification).onChange(async v => {
          this.plugin.settings.enableGamification = v;
          await this.plugin.saveSettings();
        })
      );
  }

  private renderAppearance(el: HTMLElement): void {
    new Setting(el)
      .setName('Custom Accent Color')
      .setDesc('Hex color used for progress rings, badges, and highlights (adapts to light & dark themes).')
      .addColorPicker(cp =>
        cp.setValue(this.plugin.settings.customAccentColor || '#6366f1').onChange(async val => {
          this.plugin.settings.customAccentColor = val;
          await this.plugin.saveSettings();
        })
      );

    new Setting(el)
      .setName('Interface Direction (LTR / RTL Persian Support)')
      .setDesc('Switch overall dashboard layout direction or keep LTR with automatic RTL detection for Persian text.')
      .addDropdown(d =>
        d
          .addOptions({
            ltr: 'Left-to-Right (Auto RTL for Persian fields)',
            rtl: 'Right-to-Left (Full RTL Interface)'
          })
          .setValue(this.plugin.settings.interfaceDirection)
          .onChange(async val => {
            this.plugin.settings.interfaceDirection = val as 'ltr' | 'rtl';
            await this.plugin.saveSettings();
          })
      );
  }

  private renderDataManagement(el: HTMLElement): void {
    new Setting(el)
      .setName('Plugin Local Storage Folder')
      .setDesc('Vault folder where English Hub stores its Markdown database and CSV exports.')
      .addText(t =>
        t.setValue(this.plugin.settings.dataFolderPath).onChange(async v => {
          this.plugin.settings.dataFolderPath = v.trim() || 'EnglishHub';
          await this.plugin.saveSettings();
        })
      );

    new Setting(el)
      .setName('Export Vocabulary to CSV')
      .setDesc('Save all scanned and custom vocabulary to a CSV file in your English Hub folder.')
      .addButton(btn =>
        btn.setButtonText('Export Vocabulary CSV').onClick(async () => {
          const allVocab = this.plugin.vaultScanner.getAllVocabulary();
          const path = await this.plugin.dataService.exportVocabularyCSV(allVocab);
          new Notice(`Exported vocabulary CSV to ${path}`);
        })
      );

    new Setting(el)
      .setName('Export Study Sessions & Analytics to CSV')
      .setDesc('Save all recorded study sessions to a CSV file in your English Hub folder.')
      .addButton(btn =>
        btn.setButtonText('Export Sessions CSV').onClick(async () => {
          const path = await this.plugin.dataService.exportSessionsCSV();
          new Notice(`Exported study sessions CSV to ${path}`);
        })
      );

    new Setting(el)
      .setName('Reset Plugin Settings & Sample Data')
      .setDesc('Requires explicit confirmation. Does not delete any user Markdown notes in your vault.')
      .addButton(btn =>
        btn
          .setButtonText('Reset to Defaults')
          .setWarning()
          .onClick(() => {
            new ConfirmModal(
              this.app,
              'Reset English Hub Data?',
              'This will restore default plugin settings and sample dashboard data. Your Markdown notes in the vault will NOT be deleted.',
              async () => {
                this.plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
                this.plugin.dataService.data = JSON.parse(JSON.stringify(DEFAULT_LOCAL_DATA));
                await this.plugin.saveSettings();
                await this.plugin.dataService.saveLocalDatabase();
                this.plugin.refreshOpenViews();
                this.display();
                new Notice('English Hub settings and local database reset to defaults.');
              }
            ).open();
          })
      );
  }
}
