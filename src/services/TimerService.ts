import { Notice } from 'obsidian';
import { EnglishHubSettings, SkillCategory } from '../types';
import { getTodayISO } from '../utils/dateUtils';
import { DataService } from './DataService';

export type TimerMode = 'pomodoro' | 'short-break' | 'long-break' | 'custom';

export class TimerService {
  private getSettings: () => EnglishHubSettings;
  private dataService: DataService;
  private intervalId: number | null = null;
  private onTickCallbacks: Set<() => void> = new Set();

  public mode: TimerMode = 'pomodoro';
  public category: SkillCategory = 'reading';
  public customMinutes = 30;
  public totalSeconds = 25 * 60;
  public remainingSeconds = 25 * 60;
  public isRunning = false;
  public isPaused = false;
  public sessionTopic = 'Focused Study Session';

  constructor(getSettings: () => EnglishHubSettings, dataService: DataService) {
    this.getSettings = getSettings;
    this.dataService = dataService;
    this.resetToMode('pomodoro');
  }

  public onTick(cb: () => void): () => void {
    this.onTickCallbacks.add(cb);
    return () => this.onTickCallbacks.delete(cb);
  }

  private notifyListeners(): void {
    for (const cb of this.onTickCallbacks) {
      cb();
    }
  }

  public resetToMode(mode: TimerMode): void {
    this.stopTimer(false);
    this.mode = mode;
    const s = this.getSettings();
    if (mode === 'pomodoro') {
      this.totalSeconds = s.pomodoroWorkMinutes * 60;
    } else if (mode === 'short-break') {
      this.totalSeconds = s.pomodoroShortBreakMinutes * 60;
    } else if (mode === 'long-break') {
      this.totalSeconds = s.pomodoroLongBreakMinutes * 60;
    } else {
      this.totalSeconds = Math.max(1, this.customMinutes) * 60;
    }
    this.remainingSeconds = this.totalSeconds;
    this.notifyListeners();
  }

  public startTimer(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;

    this.intervalId = window.setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds -= 1;
        this.notifyListeners();
      } else {
        void this.completeSession();
      }
    }, 1000);
    this.notifyListeners();
  }

  public pauseTimer(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.isPaused = true;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.notifyListeners();
  }

  public stopTimer(logElapsedIfStudy = true): void {
    const elapsedSeconds = this.totalSeconds - this.remainingSeconds;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    const wasActive = this.isRunning || this.isPaused;
    this.isRunning = false;
    this.isPaused = false;

    if (
      logElapsedIfStudy &&
      wasActive &&
      (this.mode === 'pomodoro' || this.mode === 'custom') &&
      elapsedSeconds >= 60
    ) {
      const mins = Math.round(elapsedSeconds / 60);
      void this.recordStudySession(mins, `${this.sessionTopic} (Partial Timer)`);
    }

    this.remainingSeconds = this.totalSeconds;
    this.notifyListeners();
  }

  private async completeSession(): Promise<void> {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.isPaused = false;

    if (this.mode === 'pomodoro' || this.mode === 'custom') {
      const minutes = Math.max(1, Math.round(this.totalSeconds / 60));
      await this.recordStudySession(minutes, this.sessionTopic);
      new Notice(`English Hub: Completed ${minutes}m ${this.category} session! Logged to statistics.`);
    } else {
      new Notice('English Hub: Break timer finished! Ready for your next study session.');
    }

    this.remainingSeconds = this.totalSeconds;
    this.notifyListeners();
  }

  private async recordStudySession(durationMinutes: number, title: string): Promise<void> {
    this.dataService.data.sessions.unshift({
      id: `timer-${Date.now()}`,
      date: getTodayISO(),
      timestamp: Date.now(),
      category: this.category,
      durationMinutes,
      title: title || `${this.category.toUpperCase()} Timer Session`,
      resourceOrTopic: 'Study Timer',
      notes: `Logged automatically via English Hub ${this.mode} timer.`
    });
    await this.dataService.saveLocalDatabase();
  }

  public getFormattedRemaining(): string {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
