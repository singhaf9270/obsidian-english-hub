import { EnglishHubSettings, GrammarTopic, HubLocalData, QuickActionConfig, VocabItem, ReviewCardItem } from './types';

export const VIEW_TYPE_ENGLISH_HUB = 'english-hub-dashboard-view';

export const DEFAULT_WIDGETS = [
  { id: 'overview', title: 'Overview Metrics', visible: true, collapsed: false, order: 0 },
  { id: 'wotd', title: 'Word of the Day & Daily Challenge', visible: true, collapsed: false, order: 1 },
  { id: 'quick-actions', title: 'Quick Actions & Plugin Integrations', visible: true, collapsed: false, order: 2 },
  { id: 'timer-mini', title: 'Active Study Timer', visible: true, collapsed: false, order: 3 },
  { id: 'planner-mini', title: 'Today\'s Study Checklist', visible: true, collapsed: false, order: 4 },
  { id: 'skills-summary', title: 'Four Skills Balance', visible: true, collapsed: false, order: 5 },
  { id: 'heatmap', title: 'Learning Consistency Heatmap', visible: true, collapsed: false, order: 6 },
  { id: 'achievements', title: 'Milestones & Gamification', visible: true, collapsed: false, order: 7 }
];

export const DEFAULT_QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'qa-daily-note',
    label: 'Open Today\'s Note',
    icon: 'calendar',
    commandId: 'daily-notes',
    pluginName: 'Core Daily Notes',
    description: 'Open or create today\'s daily study log note.',
    order: 0,
    showInReviewCenter: false
  },
  {
    id: 'qa-spaced-rep',
    label: 'Plugin Flashcard Deck Review',
    icon: 'layers',
    commandId: 'obsidian-spaced-repetition:srs-note-review-open-deck',
    pluginName: 'Spaced Repetition',
    description: 'Launch flashcard review via external Spaced Repetition plugin.',
    order: 1,
    showInReviewCenter: true
  },
  {
    id: 'qa-command-palette',
    label: 'Command Palette',
    icon: 'terminal',
    commandId: 'command-palette:open',
    pluginName: 'Core',
    description: 'Quickly run any Obsidian command.',
    order: 2,
    showInReviewCenter: false
  }
];

export const DEFAULT_SETTINGS: EnglishHubSettings = {
  currentLevel: 'B2',
  dailyStudyGoalMinutes: 45,
  weeklyStudyGoalMinutes: 300,
  monthlyStudyGoalMinutes: 1200,
  readingGoalMinutesWeekly: 90,
  listeningGoalMinutesWeekly: 90,
  speakingGoalMinutesWeekly: 60,
  writingGoalMinutesWeekly: 60,
  dataFolderPath: 'EnglishHub',
  vocabularyFolders: ['EnglishHub/Vocabulary', 'Vocabulary'],
  grammarFolders: ['EnglishHub/Grammar', 'Grammar'],
  frontmatterMap: {
    word: 'word',
    meaning: 'meaning',
    translation: 'translation',
    level: 'level',
    category: 'category',
    status: 'status',
    example: 'example',
    nextReview: 'next_review',
    interval: 'sr_interval',
    ease: 'sr_ease',
    reps: 'sr_reps',
    lapses: 'sr_lapses'
  },
  enableNativeSRS: true,
  srsInitialIntervals: [1, 3, 5],
  srsStartingEase: 2.5,
  enableGamification: true,
  compactMode: false,
  rtlSupport: true,
  interfaceDirection: 'ltr',
  customAccentColor: '#6366f1',
  pomodoroWorkMinutes: 25,
  pomodoroShortBreakMinutes: 5,
  pomodoroLongBreakMinutes: 15,
  widgets: DEFAULT_WIDGETS,
  quickActions: DEFAULT_QUICK_ACTIONS
};

export const INITIAL_GRAMMAR_TOPICS: GrammarTopic[] = [
  { id: 'g-1', title: 'Present Perfect vs. Past Simple', category: 'Tenses', level: 'B1', completed: true, notePath: '', progress: 100 },
  { id: 'g-2', title: 'Past Perfect Continuous', category: 'Tenses', level: 'B2', completed: false, notePath: '', progress: 60 },
  { id: 'g-3', title: 'Inversion in Negative Adverbials', category: 'Sentence Structures', level: 'C1', completed: false, notePath: '', progress: 25 },
  { id: 'g-4', title: 'Embedded / Indirect Questions', category: 'Questions & Negatives', level: 'B1', completed: true, notePath: '', progress: 100 },
  { id: 'g-5', title: 'Modals of Past Deduction (must/might have)', category: 'Modal Verbs', level: 'B2', completed: false, notePath: '', progress: 50 },
  { id: 'g-6', title: 'Mixed Conditionals (Type 2 & 3)', category: 'Conditionals', level: 'B2', completed: false, notePath: '', progress: 40 },
  { id: 'g-7', title: 'Dependent Prepositions (Adjective + Prep)', category: 'Prepositions', level: 'B2', completed: false, notePath: '', progress: 30 },
  { id: 'g-8', title: 'Zero Article with Abstract Nouns', category: 'Articles', level: 'B2', completed: true, notePath: '', progress: 100 },
  { id: 'g-9', title: 'Subjunctive Mood & Unreal Past', category: 'Common Mistakes', level: 'C1', completed: false, notePath: '', progress: 15 }
];

export const INITIAL_SAMPLE_VOCAB: VocabItem[] = [
  {
    id: 'v-sample-1',
    word: 'Ubiquitous',
    meaning: 'Present, appearing, or found everywhere.',
    translation: 'همه‌جا حاضر / فراگیر',
    example: 'Smartphones have become ubiquitous in modern daily life.',
    relatedGrammar: 'Often followed by prepositions "in" or "across". Adjective.',
    level: 'C1',
    category: 'Academic',
    status: 'review',
    filePath: '',
    nextReview: new Date().toISOString().slice(0, 10),
    interval: 3,
    ease: 2.5,
    reps: 2,
    lapses: 0
  },
  {
    id: 'v-sample-2',
    word: 'Resilient',
    meaning: 'Able to withstand or recover quickly from difficult conditions.',
    translation: 'مقاوم / انعطاف‌پذیر در برابر سختی',
    example: 'Language learners must remain resilient when facing plateaus.',
    relatedGrammar: 'Noun form: resilience. Collocation: resilient to change.',
    level: 'B2',
    category: 'Mindset',
    status: 'learning',
    filePath: '',
    nextReview: new Date().toISOString().slice(0, 10),
    interval: 1,
    ease: 2.5,
    reps: 1,
    lapses: 0
  },
  {
    id: 'v-sample-3',
    word: 'Eloquent',
    meaning: 'Fluent or persuasive in speaking or writing.',
    translation: 'فصیح / شیوا و بلیغ',
    example: 'She delivered an eloquent speech on global education.',
    relatedGrammar: 'Adverb: eloquently. Noun: eloquence.',
    level: 'C1',
    category: 'Communication',
    status: 'difficult',
    filePath: '',
    nextReview: new Date().toISOString().slice(0, 10),
    interval: 1,
    ease: 2.1,
    reps: 3,
    lapses: 2
  },
  {
    id: 'v-sample-4',
    word: 'Pragmatic',
    meaning: 'Dealing with things sensibly and realistically in a way that is based on practical rather than theoretical considerations.',
    translation: 'عمل‌گرایانه / واقع‌بینانه',
    example: 'We need to adopt a pragmatic approach to learning vocabulary.',
    relatedGrammar: 'Adverb: pragmatically. Opposite: idealistic.',
    level: 'C1',
    category: 'Business & Academic',
    status: 'new',
    filePath: '',
    nextReview: new Date().toISOString().slice(0, 10),
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0
  }
];

export const INITIAL_REVIEW_CARDS: ReviewCardItem[] = [
  {
    id: 'rc-1',
    type: 'grammar',
    prompt: 'Fill in the blank: "Had I known about the traffic, I ___ (leave) earlier."',
    answer: 'would have left (Third Conditional with Inversion)',
    contextOrExample: 'Inversion replaces "If I had known..." with "Had I known..."',
    nextReview: new Date().toISOString().slice(0, 10),
    interval: 1,
    ease: 2.5,
    reps: 1,
    lapses: 0
  },
  {
    id: 'rc-2',
    type: 'sentence',
    prompt: 'Paraphrase using "Not only...": "She speaks fluent English and also writes academic papers."',
    answer: 'Not only does she speak fluent English, but she also writes academic papers.',
    contextOrExample: 'Negative/restrictive adverbial at the start requires auxiliary inversion.',
    nextReview: new Date().toISOString().slice(0, 10),
    interval: 2,
    ease: 2.5,
    reps: 1,
    lapses: 0
  },
  {
    id: 'rc-3',
    type: 'mistake',
    prompt: 'Correct the mistake: "I am looking forward to meet you next week."',
    answer: 'I am looking forward to meeting you next week.',
    contextOrExample: 'In "look forward to", "to" is a preposition and must be followed by a gerund (-ing) or noun.',
    nextReview: new Date().toISOString().slice(0, 10),
    interval: 1,
    ease: 2.3,
    reps: 2,
    lapses: 1
  }
];

export const DEFAULT_LOCAL_DATA: HubLocalData = {
  version: 1,
  hasDismissedWelcome: false,
  customVocab: INITIAL_SAMPLE_VOCAB,
  grammarTopics: INITIAL_GRAMMAR_TOPICS,
  reviewCards: INITIAL_REVIEW_CARDS,
  sessions: [
    {
      id: 'sess-init-1',
      date: new Date().toISOString().slice(0, 10),
      timestamp: Date.now() - 3600000,
      category: 'reading',
      durationMinutes: 25,
      title: 'The Economist - Science & Technology Article',
      resourceOrTopic: 'Artificial Intelligence & Linguistics',
      notes: 'Focused on discourse markers and complex hedging verbs.'
    }
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Review 10 due vocabulary cards',
      category: 'vocabulary',
      horizon: 'daily',
      completed: false,
      dueDate: new Date().toISOString().slice(0, 10),
      isRoutine: true
    },
    {
      id: 'task-2',
      title: 'Read 1 English article & extract 3 collocations',
      category: 'reading',
      horizon: 'daily',
      completed: true,
      dueDate: new Date().toISOString().slice(0, 10),
      isRoutine: true
    },
    {
      id: 'task-3',
      title: 'Complete 2 shadowing sessions (15m each)',
      category: 'speaking',
      horizon: 'weekly',
      completed: false,
      dueDate: new Date().toISOString().slice(0, 10),
      isRoutine: false
    }
  ],
  wotd: {
    date: '',
    wordId: '',
    challengePrompt: 'Write one original complex sentence using today\'s Word of the Day and a subordinating conjunction (e.g., although, whereas, provided that).',
    challengeResponse: '',
    completed: false,
    recentWordIds: []
  },
  reviewHistory: []
};
