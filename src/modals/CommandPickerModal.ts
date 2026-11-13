import { App, Command, FuzzySuggestModal } from 'obsidian';
import { CommandIntegrationService } from '../services/CommandIntegrationService';

export class CommandPickerModal extends FuzzySuggestModal<Command> {
  private commandService: CommandIntegrationService;
  private onChooseCallback: (cmd: Command) => void;

  constructor(app: App, commandService: CommandIntegrationService, onChooseCallback: (cmd: Command) => void) {
    super(app);
    this.commandService = commandService;
    this.onChooseCallback = onChooseCallback;
    this.setPlaceholder('Search any installed Obsidian or plugin command...');
  }

  getItems(): Command[] {
    return this.commandService.getAllAvailableCommands();
  }

  getItemText(item: Command): string {
    return `${item.name} (${item.id})`;
  }

  onChooseItem(item: Command): void {
    this.onChooseCallback(item);
  }
}
