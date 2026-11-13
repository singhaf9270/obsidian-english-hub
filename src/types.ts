export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type SkillCategory = 'reading' | 'listening' | 'speaking' | 'writing' | 'vocabulary' | 'grammar' | 'review';
export type ReviewItemType = 'vocabulary' | 'grammar' | 'sentence' | 'mistake';
export type GrammarCategory = 'Tenses' | 'Sentence Structures' | 'Questions & Negatives' | 'Modal Verbs' | 'Conditionals' | 'Prepositions' | 'Articles' | 'Common Mistakes';

export interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  collapsed: boolean;
  order: number;
}

export interface QuickActionConfig {
  id: string;
  label: string;
  icon: string;
  commandId: string;
  pluginName: string;
  description: string;
  order: number;
  showInReviewCenter: boolean;
}

export interface FrontmatterMapping {
  word: string;
  meaning: string;
  translation: string;
  level: string;
  category: string;
  status: string;
  example: string;
  nextReview: string;
  interval: string;
  ease: string;
  reps: string;
  lapses: string;
}

export interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  translation: string;
  example: string;
  relatedGrammar: string;
  level: CEFRLevel;
  category: string;
  status: 'new' | 'learning' | 'review' | 'difficult' | 'mastered';
  filePath: string;
  nextReview: string; // YYYY-MM-DD
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  lastReviewed?: string;
}

export interface GrammarTopic {
  id: string;
  title: string;
  category: GrammarCategory;
  level: CEFRLevel;
  completed: boolean;
  notePath: string;
  progress: number; // 0 to 100
  lastStudied?: string;
}

export interface StudySessionLog {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  category: SkillCategory;
  durationMinutes: number;
  title: string;
  resourceOrTopic: string;
  notes: string;
  correctionsOrExpressions?: string;
}

export interface PlannerTask {
  id: string;
  title: string;
  category: SkillCategory;
  horizon: 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  isRoutine: boolean;
}

export interface ReviewCardItem {
  id: string;
  type: ReviewItemType;
  prompt: string;
  answer: string;
  contextOrExample: string;
  filePath?: string;
  nextReview: string; // YYYY-MM-DD
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface WordOfTheDayState {
  date: string; // YYYY-MM-DD
  wordId: string;
  challengePrompt: string;
  challengeResponse: string;
  completed: boolean;
  recentWordIds: string[];
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
  progress: number;
  target: number;
}

export interface HubLocalData {
  version: number;
  hasDismissedWelcome: boolean;
  customVocab: VocabItem[];
  grammarTopics: GrammarTopic[];
  reviewCards: ReviewCardItem[];
  sessions: StudySessionLog[];
  tasks: PlannerTask[];
  wotd: WordOfTheDayState;
  reviewHistory: {
    date: string;
    itemId: string;
    type: ReviewItemType;
    rating: 'again' | 'hard' | 'good' | 'easy';
  }[];
}

export interface EnglishHubSettings {
  currentLevel: CEFRLevel;
  dailyStudyGoalMinutes: number;
  weeklyStudyGoalMinutes: number;
  monthlyStudyGoalMinutes: number;
  readingGoalMinutesWeekly: number;
  listeningGoalMinutesWeekly: number;
  speakingGoalMinutesWeekly: number;
  writingGoalMinutesWeekly: number;
  dataFolderPath: string;
  vocabularyFolders: string[];
  grammarFolders: string[];
  frontmatterMap: FrontmatterMapping;
  enableNativeSRS: boolean;
  srsInitialIntervals: [number, number, number]; // Again, Good, Easy days
  srsStartingEase: number;
  enableGamification: boolean;
  compactMode: boolean;
  rtlSupport: boolean;
  interfaceDirection: 'ltr' | 'rtl';
  customAccentColor: string;
  pomodoroWorkMinutes: number;
  pomodoroShortBreakMinutes: number;
  pomodoroLongBreakMinutes: number;
  widgets: WidgetConfig[];
  quickActions: QuickActionConfig[];
}
