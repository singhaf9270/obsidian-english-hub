import { App, Command, Notice } from 'obsidian';

declare module 'obsidian' {
  interface App {
    commands: {
      listCommands(): Command[];
      executeCommandById(id: string): boolean;
      findCommand(id: string): Command | undefined;
    };
  }
}

export class CommandIntegrationService {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  public getAllAvailableCommands(): Command[] {
    try {
      if (this.app.commands && typeof this.app.commands.listCommands === 'function') {
        return this.app.commands.listCommands();
      }
    } catch (error) {
      console.error('English Hub: Failed to list commands', error);
    }
    return [];
  }

  public isCommandAvailable(commandId: string): boolean {
    if (!commandId) return false;
    const commands = this.getAllAvailableCommands();
    return commands.some(c => c.id === commandId);
  }

  public executeCommandSafely(commandId: string, label?: string): boolean {
    if (!commandId || !commandId.trim()) {
      new Notice('English Hub: No Command ID configured for this button.');
      return false;
    }

    const available = this.isCommandAvailable(commandId);
    if (!available) {
      new Notice(
        `English Hub: Command "${commandId}" (${label || 'Quick Action'}) is unavailable. Ensure the associated plugin is installed and enabled.`,
        6000
      );
      return false;
    }

    try {
      const executed = this.app.commands.executeCommandById(commandId);
      if (!executed) {
        new Notice(`English Hub: Command "${label || commandId}" could not be executed in the current context.`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('English Hub: Error executing command', commandId, err);
      new Notice(`English Hub: Error running command "${commandId}".`);
      return false;
    }
  }
}
