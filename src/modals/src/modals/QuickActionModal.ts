import { App, Modal, Notice, Setting } from 'obsidian';
import { CommandIntegrationService } from '../services/CommandIntegrationService';
import { QuickActionConfig } from '../types';
import { CommandPickerModal } from './CommandPickerModal';

export class QuickActionModal extends Modal {
  private action: QuickActionConfig;
  private commandService: CommandIntegrationService;
  private onSave: (action: QuickActionConfig) => Promise<void>;

  constructor(
    app: App,
    commandService: CommandIntegrationService,
    existingAction: QuickActionConfig | null,
    defaultOrder: number,
    onSave: (action: QuickActionConfig) => Promise<void>
  ) {
    super(app);
    this.commandService = commandService;
    this.onSave = onSave;
    this.action = existingAction
      ? { ...existingAction }
      : {
          id: `qa-${Date.now()}`,
          label: '',
          icon: 'zap',
          commandId: '',
          pluginName: 'Custom Plugin',
          description: '',
          order: defaultOrder,
          showInReviewCenter: false
        };
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Configure Quick Action & Plugin Command' });

    new Setting(contentEl)
      .setName('Button label')
      .setDesc('Display name on the Quick Action or Review button.')
      .addText(text =>
        text
          .setPlaceholder('e.g., Start Anki Review')
          .setValue(this.action.label)
          .onChange(val => (this.action.label = val.trim()))
      );

    new Setting(contentEl)
      .setName('Lucide icon name')
      .setDesc('Any Obsidian Lucide icon ID (e.g., layers, flame, play, book-open, calendar, terminal).')
      .addText(text =>
        text
          .setPlaceholder('zap')
          .setValue(this.action.icon)
          .onChange(val => (this.action.icon = val.trim() || 'zap'))
      );

    let cmdInputRef: HTMLInputElement | null = null;
    let pluginInputRef: HTMLInputElement | null = null;

    new Setting(contentEl)
      .setName('Command ID')
      .setDesc('Select from installed plugins or enter a command ID manually.')
      .addText(text => {
        cmdInputRef = text.inputEl;
        text
          .setPlaceholder('plugin-id:command-name')
          .setValue(this.action.commandId)
          .onChange(val => (this.action.commandId = val.trim()));
      })
      .addButton(btn =>
        btn
          .setButtonText('Search Commands')
          .setCta()
          .onClick(() => {
            new CommandPickerModal(this.app, this.commandService, cmd => {
              this.action.commandId = cmd.id;
              if (cmdInputRef) cmdInputRef.value = cmd.id;
              if (!this.action.label) {
                this.action.label = cmd.name;
              }
              const prefix = cmd.id.includes(':') ? cmd.id.split(':')[0] : 'Core';
              this.action.pluginName = prefix;
              if (pluginInputRef) pluginInputRef.value = prefix;
            }).open();
          })
      );

    new Setting(contentEl)
      .setName('Associated plugin name')
      .setDesc('Label indicating which plugin provides this command.')
      .addText(text => {
        pluginInputRef = text.inputEl;
        text
          .setPlaceholder('e.g., Spaced Repetition')
          .setValue(this.action.pluginName)
          .onChange(val => (this.action.pluginName = val.trim()));
      });

    new Setting(contentEl)
      .setName('Description (optional)')
      .setDesc('Tooltip and subtitle shown on the card.')
      .addText(text =>
        text
          .setPlaceholder('Brief explanation of what this button does')
          .setValue(this.action.description)
          .onChange(val => (this.action.description = val.trim()))
      );

    new Setting(contentEl)
      .setName('Also display in Review Center')
      .setDesc('Show this integration button inside the Review Center tab as well.')
      .addToggle(toggle =>
        toggle.setValue(this.action.showInReviewCenter).onChange(val => (this.action.showInReviewCenter = val))
      );

    new Setting(contentEl)
      .addButton(btn =>
        btn
          .setButtonText('Save Action')
          .setCta()
          .onClick(async () => {
            if (!this.action.label || !this.action.commandId) {
              new Notice('Please provide both a button label and a Command ID.');
              return;
            }
            await this.onSave(this.action);
            this.close();
          })
      )
      .addButton(btn =>
        btn.setButtonText('Cancel').onClick(() => {
          this.close();
        })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
