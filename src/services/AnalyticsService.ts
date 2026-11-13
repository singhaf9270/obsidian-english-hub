import { AchievementBadge, EnglishHubSettings, GrammarTopic, SkillCategory, VocabItem } from '../types';
import { addDaysISO, getTodayISO, isDateInCurrentMonth, isDateInCurrentWeek } from '../utils/dateUtils';
import { DataService } from './DataService';

export class AnalyticsService {
  private getSettings: () => EnglishHubSettings;
  private dataService: DataService;

  constructor(getSettings: () => EnglishHubSettings, dataService: DataService) {
    this.getSettings = getSettings;
    this.dataService = dataService;
  }

  public getStudyMinutesForDate(dateISO: string): number {
    return this.dataService.data.sessions
      .filter(s => s.date === dateISO)
      .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
  }

  public getTodayStudyMinutes(): number {
    return this.getStudyMinutesForDate(getTodayISO());
  }

  public getWeeklyStudyMinutes(): number {
    return this.dataService.data.sessions
      .filter(s => isDateInCurrentWeek(s.date))
      .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
  }

  public getMonthlyStudyMinutes(): number {
    return this.dataService.data.sessions
      .filter(s => isDateInCurrentMonth(s.date))
      .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
  }

  public getTotalStudyMinutes(): number {
    return this.dataService.data.sessions
      .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
  }

  public getSkillMinutes(skill: SkillCategory, weeklyOnly = false): number {
    return this.dataService.data.sessions
      .filter(s => s.category === skill && (!weeklyOnly || isDateInCurrentWeek(s.date)))
      .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0);
  }

  public getCurrentStreak(): number {
    const activeDates = new Set<string>();
    for (const s of this.dataService.data.sessions) {
      if (s.durationMinutes > 0) activeDates.add(s.date);
    }
    for (const r of this.dataService.data.reviewHistory) {
      activeDates.add(r.date);
    }

    const today = getTodayISO();
    let checkDate = today;
    if (!activeDates.has(today)) {
      const yesterday = addDaysISO(today, -1);
      if (!activeDates.has(yesterday)) return 0;
      checkDate = yesterday;
    }

    let streak = 0;
    while (activeDates.has(checkDate)) {
      streak += 1;
      checkDate = addDaysISO(checkDate, -1);
    }
    return streak;
  }

  public getHeatmapData(daysCount = 84): { date: string; minutes: number; reviews: number; level: 0 | 1 | 2 | 3 | 4 }[] {
    const today = getTodayISO();
    const result: { date: string; minutes: number; reviews: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const dateStr = addDaysISO(today, -i);
      const minutes = this.getStudyMinutesForDate(dateStr);
      const reviews = this.dataService.data.reviewHistory.filter(r => r.date === dateStr).length;
      const score = minutes + reviews * 2;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (score > 0 && score < 15) level = 1;
      else if (score >= 15 && score < 35) level = 2;
      else if (score >= 35 && score < 60) level = 3;
      else if (score >= 60) level = 4;

      result.push({ date: dateStr, minutes, reviews, level });
    }
    return result;
  }

  public getOverallProgressPercentage(allVocab: VocabItem[], grammarTopics: GrammarTopic[]): number {
    const vocabScore = Math.min(100, (allVocab.length / 50) * 100);
    const grammarCompleted = grammarTopics.filter(g => g.completed).length;
    const grammarScore = grammarTopics.length > 0 ? (grammarCompleted / grammarTopics.length) * 100 : 0;
    const weeklyGoal = this.getSettings().weeklyStudyGoalMinutes || 300;
    const weeklyScore = Math.min(100, (this.getWeeklyStudyMinutes() / weeklyGoal) * 100);

    return Math.round((vocabScore * 0.35) + (grammarScore * 0.35) + (weeklyScore * 0.30));
  }

  public getAchievements(allVocab: VocabItem[], grammarTopics: GrammarTopic[]): AchievementBadge[] {
    const streak = this.getCurrentStreak();
    const totalMinutes = this.getTotalStudyMinutes();
    const vocabCount = allVocab.length;
    const totalReviews = this.dataService.data.reviewHistory.length;
    const completedGrammar = grammarTopics.filter(g => g.completed).length;

    return [
      {
        id: 'ach-streak-3',
        title: 'Consistent Spark',
        description: 'Maintain a 3-day English study streak.',
        icon: 'flame',
        unlocked: streak >= 3,
        progress: Math.min(3, streak),
        target: 3
      },
      {
        id: 'ach-streak-7',
        title: 'Unstoppable Week',
        description: 'Reach a 7-day continuous learning streak.',
        icon: 'zap',
        unlocked: streak >= 7,
        progress: Math.min(7, streak),
        target: 7
      },
      {
        id: 'ach-vocab-25',
        title: 'Lexicon Builder',
        description: 'Collect 25 vocabulary words in your vault.',
        icon: 'book-open',
        unlocked: vocabCount >= 25,
        progress: Math.min(25, vocabCount),
        target: 25
      },
      {
        id: 'ach-vocab-100',
        title: 'Wordsmith',
        description: 'Reach 100 saved vocabulary words.',
        icon: 'award',
        unlocked: vocabCount >= 100,
        progress: Math.min(100, vocabCount),
        target: 100
      },
      {
        id: 'ach-time-300',
        title: 'Dedicated Scholar',
        description: 'Log 300 minutes (5 hours) of focused study time.',
        icon: 'clock',
        unlocked: totalMinutes >= 300,
        progress: Math.min(300, totalMinutes),
        target: 300
      },
      {
        id: 'ach-reviews-50',
        title: 'Memory Master',
        description: 'Complete 50 spaced-repetition review ratings.',
        icon: 'layers',
        unlocked: totalReviews >= 50,
        progress: Math.min(50, totalReviews),
        target: 50
      },
      {
        id: 'ach-grammar-5',
        title: 'Syntax Architect',
        description: 'Master 5 grammar topics in the Grammar Center.',
        icon: 'check-circle',
        unlocked: completedGrammar >= 5,
        progress: Math.min(5, completedGrammar),
        target: 5
      }
    ];
  }
}
