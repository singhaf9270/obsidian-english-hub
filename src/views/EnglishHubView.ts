import { ItemView, Notice, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import { VIEW_TYPE_ENGLISH_HUB } from '../constants';
import EnglishHubPlugin from '../main';
import { AddVocabModal } from '../modals/AddVocabModal';
import { LogSkillSessionModal } from '../modals/LogSkillSessionModal';
import { NativeReviewModal } from '../modals/NativeReviewModal';
import { QuickActionModal } from '../modals/QuickActionModal';
import { CEFRLevel, GrammarCategory, SkillCategory, VocabItem } from '../types';
import { formatMinutes, getTodayISO } from '../utils/dateUtils';
import { containsPersianOrArabic, createProgressRing } from '../utils/domUtils';

type HubTab =
  | 'dashboard'
  | 'vocabulary'
  | 'review'
  | 'grammar'
  | 'skills'
  | 'planner'
  | 'timer'
  | 'analytics';

export class EnglishHubView extends ItemView {
  private plugin: EnglishHubPlugin;
  private activeTab: HubTab = 'dashboard';
  private activeSkillSubTab: 'reading' | 'listening' | 'speaking' | 'writing' = 'reading';

  // Vocabulary filter state
  private vocabSearchQuery = '';
  private vocabLevelFilter: string = 'ALL';
  private vocabStatusFilter: string = 'ALL';
  private vocabSortBy: 'word' | 'level' | 'nextReview' = 'word';

  // Grammar filter state
  private grammarCategoryFilter: string = 'ALL';

  // Drag-and-drop widget state
  private draggedWidgetId: string | null = null;
  private unsubscribeTimer: (() => void) | null = null;
  private timerDisplayEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: EnglishHubPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_ENGLISH_HUB;
  }

  getDisplayText(): string {
    return 'English Hub';
  }

  getIcon(): string {
    return 'graduation-cap';
  }

  async onOpen(): Promise<void> {
    this.unsubscribeTimer = this.plugin.timerService.onTick(() => {
      if (this.timerDisplayEl && this.timerDisplayEl.isConnected) {
        this.timerDisplayEl.setText(this.plugin.timerService.getFormattedRemaining());
      }
    });
    this.render();
  }

  async onClose(): Promise<void> {
    if (this.unsubscribeTimer) {
      this.unsubscribeTimer();
      this.unsubscribeTimer = null;
    }
  }

  public render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('eh-root');

    // Apply custom accent color and layout direction
    contentEl.style.setProperty('--eh-accent', this.plugin.settings.customAccentColor || '#6366f1');
    contentEl.setAttribute('dir', this.plugin.settings.interfaceDirection || 'ltr');
    contentEl.toggleClass('eh-compact', this.plugin.settings.compactMode);

    this.renderTopNavigation(contentEl);

    const mainBody = contentEl.createDiv({ cls: 'eh-main-body' });

    switch (this.activeTab) {
      case 'dashboard':
        this.renderDashboardTab(mainBody);
        break;
      case 'vocabulary':
        this.renderVocabularyTab(mainBody);
        break;
      case 'review':
        this.renderReviewTab(mainBody);
        break;
      case 'grammar':
        this.renderGrammarTab(mainBody);
        break;
      case 'skills':
        this.renderSkillsTab(mainBody);
        break;
      case 'planner':
        this.renderPlannerTab(mainBody);
        break;
      case 'timer':
        this.renderTimerTab(mainBody);
        break;
      case 'analytics':
        this.renderAnalyticsTab(mainBody);
        break;
    }
  }

  private renderTopNavigation(container: HTMLElement): void {
    const topBar = container.createDiv({ cls: 'eh-topbar' });

    const brand = topBar.createDiv({ cls: 'eh-brand' });
    const iconSpan = brand.createSpan({ cls: 'eh-brand-icon' });
    setIcon(iconSpan, 'graduation-cap');
    const titleWrap = brand.createDiv();
    titleWrap.createEl('h1', { text: 'English Hub', cls: 'eh-brand-title' });
    titleWrap.createSpan({
      text: `CEFR ${this.plugin.settings.currentLevel} • Interactive Language Workspace`,
      cls: 'eh-brand-subtitle'
    });

    const navTabs = topBar.createDiv({ cls: 'eh-nav-tabs' });
    const tabs: { id: HubTab; label: string; icon: string }[] = [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { id: 'vocabulary', label: 'Vocabulary', icon: 'book-open' },
      { id: 'review', label: 'Review Center', icon: 'layers' },
      { id: 'grammar', label: 'Grammar', icon: 'spell-check' },
      { id: 'skills', label: '4 Skills', icon: 'headphones' },
      { id: 'planner', label: 'Planner', icon: 'calendar-check' },
      { id: 'timer', label: 'Timer', icon: 'timer' },
      { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' }
    ];

    for (const tab of tabs) {
      const btn = navTabs.createEl('button', {
        cls: `eh-nav-btn ${this.activeTab === tab.id ? 'is-active' : ''}`
      });
      const ic = btn.createSpan({ cls: 'eh-nav-btn-icon' });
      setIcon(ic, tab.icon);
      btn.createSpan({ text: tab.label });
      btn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.render();
      });
    }
  }

  // =========================================================================
  // 1. DASHBOARD TAB
  // =========================================================================
  private renderDashboardTab(container: HTMLElement): void {
    const allVocab = this.plugin.vaultScanner.getAllVocabulary();
    const allGrammar = this.plugin.vaultScanner.getAllGrammarTopics();
    const dueVocab = this.plugin.srsService.getDueVocabulary(allVocab);
    const dueCards = this.plugin.srsService.getDueReviewCards();
    const totalDueCount = dueVocab.due.length + dueCards.due.length;

    // Welcome Banner (First-time UX)
    if (!this.plugin.dataService.data.hasDismissedWelcome) {
      const welcome = container.createDiv({ cls: 'eh-welcome-banner eh-glass-card' });
      const welcomeText = welcome.createDiv({ cls: 'eh-welcome-content' });
      welcomeText.createEl('h3', { text: 'Welcome to English Hub!' });
      welcomeText.createEl('p', {
        text: 'Your all-in-one English learning workspace is ready with sample vocabulary, grammar topics, study timer, and plugin integrations. Drag and drop dashboard widgets to reorder them or customize folders in Settings.'
      });
      const dismissBtn = welcome.createEl('button', { text: 'Got it, dismiss', cls: 'mod-cta' });
      dismissBtn.addEventListener('click', async () => {
        this.plugin.dataService.data.hasDismissedWelcome = true;
        await this.plugin.dataService.saveLocalDatabase();
        this.render();
      });
    }

    const widgets = [...this.plugin.settings.widgets]
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order);

    const grid = container.createDiv({ cls: 'eh-dashboard-widgets-stack' });

    for (const widget of widgets) {
      if (widget.id === 'achievements' && !this.plugin.settings.enableGamification) continue;

      const widgetWrapper = grid.createDiv({ cls: 'eh-widget-shell eh-glass-card' });
      widgetWrapper.setAttribute('draggable', 'true');

      // Drag and drop reordering
      widgetWrapper.addEventListener('dragstart', () => {
        this.draggedWidgetId = widget.id;
        widgetWrapper.addClass('is-dragging');
      });
      widgetWrapper.addEventListener('dragend', () => {
        widgetWrapper.removeClass('is-dragging');
      });
      widgetWrapper.addEventListener('dragover', e => {
        e.preventDefault();
      });
      widgetWrapper.addEventListener('drop', async e => {
        e.preventDefault();
        if (!this.draggedWidgetId || this.draggedWidgetId === widget.id) return;
        const src = this.plugin.settings.widgets.find(w => w.id === this.draggedWidgetId);
        const target = this.plugin.settings.widgets.find(w => w.id === widget.id);
        if (src && target) {
          const temp = src.order;
          src.order = target.order;
          target.order = temp;
          await this.plugin.saveSettings();
          this.render();
        }
      });

      const header = widgetWrapper.createDiv({ cls: 'eh-widget-header' });
      const titleGroup = header.createDiv({ cls: 'eh-widget-title-group' });
      const dragHandle = titleGroup.createSpan({ cls: 'eh-drag-handle', attr: { title: 'Drag to reorder widget' } });
      setIcon(dragHandle, 'grip-vertical');
      titleGroup.createEl('h3', { text: widget.title });

      const actionsGroup = header.createDiv({ cls: 'eh-widget-actions' });
      const collapseBtn = actionsGroup.createEl('button', {
        cls: 'eh-icon-btn',
        attr: { title: widget.collapsed ? 'Expand section' : 'Collapse section' }
      });
      setIcon(collapseBtn, widget.collapsed ? 'chevron-down' : 'chevron-up');
      collapseBtn.addEventListener('click', async () => {
        widget.collapsed = !widget.collapsed;
        await this.plugin.saveSettings();
        this.render();
      });

      if (widget.collapsed) continue;

      const body = widgetWrapper.createDiv({ cls: 'eh-widget-body' });

      switch (widget.id) {
        case 'overview':
          this.renderOverviewCardsWidget(body, allVocab, allGrammar, totalDueCount);
          break;
        case 'wotd':
          this.renderWordOfTheDayWidget(body, allVocab);
          break;
        case 'quick-actions':
          this.renderQuickActionsWidget(body, false);
          break;
        case 'timer-mini':
          this.renderMiniTimerWidget(body);
          break;
        case 'planner-mini':
          this.renderMiniPlannerWidget(body);
          break;
        case 'skills-summary':
          this.renderSkillsSummaryWidget(body);
          break;
        case 'heatmap':
          this.renderHeatmapWidget(body);
          break;
        case 'achievements':
          this.renderAchievementsWidget(body, allVocab, allGrammar);
          break;
      }
    }
  }

  private renderOverviewCardsWidget(
    container: HTMLElement,
    allVocab: VocabItem[],
    allGrammar: { completed: boolean }[],
    totalDueCount: number
  ): void {
    const streak = this.plugin.analyticsService.getCurrentStreak();
    const totalMinutes = this.plugin.analyticsService.getTotalStudyMinutes();
    const weeklyMinutes = this.plugin.analyticsService.getWeeklyStudyMinutes();
    const weeklyGoal = this.plugin.settings.weeklyStudyGoalMinutes;
    const overallProgress = this.plugin.analyticsService.getOverallProgressPercentage(
      allVocab,
      this.plugin.vaultScanner.getAllGrammarTopics()
    );
    const todayISO = getTodayISO();
    const todaySessionsCount = this.plugin.dataService.data.sessions.filter(s => s.date === todayISO).length;
    const todayReviewsCount = this.plugin.dataService.data.reviewHistory.filter(r => r.date === todayISO).length;

    const cardsGrid = container.createDiv({ cls: 'eh-overview-grid' });

    const metrics = [
      { label: 'Current Level', value: this.plugin.settings.currentLevel, sub: 'CEFR Target', icon: 'award' },
      { label: 'Learning Streak', value: `${streak} days`, sub: 'Active consistency', icon: 'flame' },
      { label: 'Total Study Time', value: formatMinutes(totalMinutes), sub: 'All logged sessions', icon: 'clock' },
      { label: 'Vocabulary Count', value: String(allVocab.length), sub: 'Saved in Vault & Hub', icon: 'book-open' },
      { label: 'Due for Review', value: String(totalDueCount), sub: 'Cards ready today', icon: 'layers' },
      {
        label: 'Weekly Study Goal',
        value: `${formatMinutes(weeklyMinutes)} / ${formatMinutes(weeklyGoal)}`,
        sub: `${Math.min(100, Math.round((weeklyMinutes / weeklyGoal) * 100))}% of weekly target`,
        icon: 'target'
      },
      { label: 'Overall Progress', value: `${overallProgress}%`, sub: 'Vocab, Grammar & Goal', icon: 'trending-up' },
      {
        label: "Today's Activities",
        value: `${todaySessionsCount} sess • ${todayReviewsCount} rev`,
        sub: `${formatMinutes(this.plugin.analyticsService.getTodayStudyMinutes())} studied today`,
        icon: 'check-circle-2'
      }
    ];

    for (const m of metrics) {
      const card = cardsGrid.createDiv({ cls: 'eh-metric-card' });
      const top = card.createDiv({ cls: 'eh-metric-top' });
      top.createSpan({ text: m.label, cls: 'eh-metric-label' });
      const ic = top.createSpan({ cls: 'eh-metric-icon' });
      setIcon(ic, m.icon);
      card.createDiv({ text: m.value, cls: 'eh-metric-value' });
      card.createDiv({ text: m.sub, cls: 'eh-metric-sub' });
    }
  }

  private renderWordOfTheDayWidget(container: HTMLElement, allVocab: VocabItem[]): void {
    if (allVocab.length === 0) {
      container.createEl('p', { text: 'Add vocabulary words to unlock the Word of the Day & Daily Challenge.' });
      return;
    }

    const today = getTodayISO();
    const wotdState = this.plugin.dataService.data.wotd;

    let selectedWord = allVocab.find(v => v.id === wotdState.wordId);
    if (wotdState.date !== today || !selectedWord) {
      const candidates = allVocab.filter(v => !wotdState.recentWordIds.includes(v.id));
      const pool = candidates.length > 0 ? candidates : allVocab;
      selectedWord = pool[Math.floor(Math.random() * pool.length)];

      wotdState.date = today;
      wotdState.wordId = selectedWord.id;
      wotdState.completed = false;
      wotdState.challengeResponse = '';
      wotdState.recentWordIds = [selectedWord.id, ...wotdState.recentWordIds.slice(0, 14)];
      void this.plugin.dataService.saveLocalDatabase();
    }

    const layout = container.createDiv({ cls: 'eh-wotd-grid' });

    // Left: Word of the Day
    const wordBox = layout.createDiv({ cls: 'eh-wotd-card' });
    const badgeRow = wordBox.createDiv({ cls: 'eh-badge-row' });
    badgeRow.createSpan({ text: 'WORD OF THE DAY', cls: 'eh-badge eh-badge-accent' });
    badgeRow.createSpan({ text: selectedWord.level, cls: 'eh-badge' });
    badgeRow.createSpan({ text: selectedWord.category, cls: 'eh-badge' });

    wordBox.createEl('h2', { text: selectedWord.word, cls: 'eh-wotd-title' });
    wordBox.createEl('p', { text: selectedWord.meaning, cls: 'eh-wotd-meaning' });

    if (selectedWord.translation) {
      const tr = wordBox.createEl('p', { text: selectedWord.translation, cls: 'eh-wotd-translation' });
      if (containsPersianOrArabic(selectedWord.translation)) tr.setAttribute('dir', 'rtl');
    }
    if (selectedWord.example) {
      wordBox.createEl('blockquote', { text: selectedWord.example });
    }
    if (selectedWord.relatedGrammar) {
      wordBox.createEl('p', { text: `Grammar / Usage: ${selectedWord.relatedGrammar}`, cls: 'eh-muted' });
    }

    const rotateBtn = wordBox.createEl('button', { text: 'Pick Another Random Word', cls: 'eh-btn-secondary' });
    rotateBtn.addEventListener('click', async () => {
      const nextPool = allVocab.filter(v => v.id !== selectedWord!.id);
      if (nextPool.length > 0) {
        const nextWord = nextPool[Math.floor(Math.random() * nextPool.length)];
        wotdState.wordId = nextWord.id;
        await this.plugin.dataService.saveLocalDatabase();
        this.render();
      }
    });

    // Right: Daily Challenge
    const challengeBox = layout.createDiv({ cls: 'eh-challenge-card' });
    const chHeader = challengeBox.createDiv({ cls: 'eh-badge-row' });
    chHeader.createSpan({ text: 'DAILY SENTENCE CHALLENGE', cls: 'eh-badge eh-badge-accent' });
    chHeader.createSpan({
      text: wotdState.completed ? 'Completed ✓' : 'Pending',
      cls: `eh-badge ${wotdState.completed ? 'eh-badge-success' : ''}`
    });

    challengeBox.createEl('p', { text: wotdState.challengePrompt });

    const textarea = challengeBox.createEl('textarea', {
      cls: 'eh-challenge-input',
      attr: { placeholder: `Write a sentence using "${selectedWord.word}"...`, rows: '3' }
    });
    textarea.value = wotdState.challengeResponse || '';

    const completeBtn = challengeBox.createEl('button', {
      text: wotdState.completed ? 'Update Challenge Response' : 'Complete Daily Challenge',
      cls: 'mod-cta'
    });
    completeBtn.addEventListener('click', async () => {
      if (!textarea.value.trim()) {
        new Notice('Write your sentence before marking the challenge complete!');
        return;
      }
      wotdState.challengeResponse = textarea.value.trim();
      wotdState.completed = true;
      await this.plugin.dataService.saveLocalDatabase();
      new Notice('Daily Challenge completed!');
      this.render();
    });
  }

  private renderQuickActionsWidget(container: HTMLElement, reviewOnly: boolean): void {
    const actions = [...this.plugin.settings.quickActions]
      .filter(a => (!reviewOnly || a.showInReviewCenter))
      .sort((a, b) => a.order - b.order);

    const grid = container.createDiv({ cls: 'eh-quick-actions-grid' });

    for (const act of actions) {
      const isAvailable = this.plugin.commandService.isCommandAvailable(act.commandId);
      const btnCard = grid.createDiv({
        cls: `eh-qa-card ${!isAvailable ? 'is-unavailable' : ''}`,
        attr: { title: act.description || act.commandId }
      });

      const iconWrap = btnCard.createDiv({ cls: 'eh-qa-icon' });
      setIcon(iconWrap, act.icon || 'zap');

      const info = btnCard.createDiv({ cls: 'eh-qa-info' });
      info.createDiv({ text: act.label, cls: 'eh-qa-label' });
      info.createDiv({
        text: isAvailable ? act.pluginName : `${act.pluginName} (Command unavailable)`,
        cls: 'eh-qa-plugin'
      });

      btnCard.addEventListener('click', () => {
        this.plugin.commandService.executeCommandSafely(act.commandId, act.label);
      });
    }

    const addBtn = grid.createDiv({ cls: 'eh-qa-card eh-qa-add' });
    const plusIcon = addBtn.createDiv({ cls: 'eh-qa-icon' });
    setIcon(plusIcon, 'plus');
    const addInfo = addBtn.createDiv({ cls: 'eh-qa-info' });
    addInfo.createDiv({ text: 'Add Plugin Action', cls: 'eh-qa-label' });
    addInfo.createDiv({ text: 'Connect any command', cls: 'eh-qa-plugin' });
    addBtn.addEventListener('click', () => {
      new QuickActionModal(
        this.app,
        this.plugin.commandService,
        null,
        this.plugin.settings.quickActions.length,
        async newAction => {
          if (reviewOnly) newAction.showInReviewCenter = true;
          this.plugin.settings.quickActions.push(newAction);
          await this.plugin.saveSettings();
          this.render();
        }
      ).open();
    });
  }

  private renderMiniTimerWidget(container: HTMLElement): void {
    const t = this.plugin.timerService;
    const row = container.createDiv({ cls: 'eh-mini-timer-row' });

    const timeBox = row.createDiv({ cls: 'eh-mini-timer-display' });
    this.timerDisplayEl = timeBox.createSpan({
      text: t.getFormattedRemaining(),
      cls: 'eh-timer-digits-sm'
    });
    timeBox.createSpan({
      text: `${t.mode.toUpperCase()} • ${t.category.toUpperCase()}`,
      cls: 'eh-badge eh-badge-accent'
    });

    const controls = row.createDiv({ cls: 'eh-timer-controls' });
    if (!t.isRunning) {
      const startBtn = controls.createEl('button', { text: t.isPaused ? 'Resume' : 'Start', cls: 'mod-cta' });
      startBtn.addEventListener('click', () => {
        t.startTimer();
        this.render();
      });
    } else {
      const pauseBtn = controls.createEl('button', { text: 'Pause' });
      pauseBtn.addEventListener('click', () => {
        t.pauseTimer();
        this.render();
      });
    }

    const stopBtn = controls.createEl('button', { text: 'Reset / Stop' });
    stopBtn.addEventListener('click', () => {
      t.stopTimer(true);
      this.render();
    });

    const openFullBtn = controls.createEl('button', { text: 'Open Full Timer', cls: 'eh-btn-secondary' });
    openFullBtn.addEventListener('click', () => {
      this.activeTab = 'timer';
      this.render();
    });
  }

  private renderMiniPlannerWidget(container: HTMLElement): void {
    const tasks = this.plugin.dataService.data.tasks.slice(0, 5);
    const list = container.createDiv({ cls: 'eh-checklist' });

    for (const task of tasks) {
      const item = list.createDiv({ cls: `eh-checklist-item ${task.completed ? 'is-done' : ''}` });
      const cb = item.createEl('input', { type: 'checkbox' });
      cb.checked = task.completed;
      cb.addEventListener('change', async () => {
        task.completed = cb.checked;
        await this.plugin.dataService.saveLocalDatabase();
        this.render();
      });
      item.createSpan({ text: task.title, cls: 'eh-checklist-title' });
      item.createSpan({ text: task.horizon, cls: 'eh-badge' });
    }
  }

  private renderSkillsSummaryWidget(container: HTMLElement): void {
    const s = this.plugin.settings;
    const skills: { id: SkillCategory; label: string; goal: number }[] = [
      { id: 'reading', label: 'Reading', goal: s.readingGoalMinutesWeekly },
      { id: 'listening', label: 'Listening', goal: s.listeningGoalMinutesWeekly },
      { id: 'speaking', label: 'Speaking', goal: s.speakingGoalMinutesWeekly },
      { id: 'writing', label: 'Writing', goal: s.writingGoalMinutesWeekly }
    ];

    const grid = container.createDiv({ cls: 'eh-skills-rings-grid' });
    for (const sk of skills) {
      const card = grid.createDiv({ cls: 'eh-skill-ring-card' });
      const mins = this.plugin.analyticsService.getSkillMinutes(sk.id, true);
      const pct = sk.goal > 0 ? (mins / sk.goal) * 100 : 0;
      createProgressRing(card, pct, 68, 6);
      card.createEl('h4', { text: sk.label });
      card.createSpan({ text: `${mins}m / ${sk.goal}m this week`, cls: 'eh-muted' });
    }
  }

  private renderHeatmapWidget(container: HTMLElement): void {
    const cells = this.plugin.analyticsService.getHeatmapData(84);
    const wrap = container.createDiv({ cls: 'eh-heatmap-wrap' });
    const grid = wrap.createDiv({ cls: 'eh-heatmap-grid' });

    for (const c of cells) {
      grid.createDiv({
        cls: `eh-heatmap-cell eh-heat-${c.level}`,
        attr: { title: `${c.date}: ${c.minutes}m studied, ${c.reviews} reviews` }
      });
    }

    const legend = wrap.createDiv({ cls: 'eh-heatmap-legend' });
    legend.createSpan({ text: 'Less', cls: 'eh-muted' });
    for (let l = 0; l <= 4; l++) {
      legend.createDiv({ cls: `eh-heatmap-cell eh-heat-${l}` });
    }
    legend.createSpan({ text: 'More (Last 12 Weeks)', cls: 'eh-muted' });
  }

  private renderAchievementsWidget(
    container: HTMLElement,
    allVocab: VocabItem[],
    allGrammar: { completed: boolean }[]
  ): void {
    const badges = this.plugin.analyticsService.getAchievements(
      allVocab,
      this.plugin.vaultScanner.getAllGrammarTopics()
    );
    const grid = container.createDiv({ cls: 'eh-achievements-grid' });

    for (const b of badges) {
      const card = grid.createDiv({ cls: `eh-badge-card ${b.unlocked ? 'is-unlocked' : 'is-locked'}` });
      const ic = card.createDiv({ cls: 'eh-badge-card-icon' });
      setIcon(ic, b.icon);
      const info = card.createDiv({ cls: 'eh-badge-card-info' });
      info.createEl('h4', { text: b.title });
      info.createEl('p', { text: b.description, cls: 'eh-muted' });
      const bar = info.createDiv({ cls: 'eh-progress-bar-track' });
      const fill = bar.createDiv({ cls: 'eh-progress-bar-fill' });
      fill.style.width = `${Math.min(100, Math.round((b.progress / b.target) * 100))}%`;
    }
  }

  // =========================================================================
  // 2. VOCABULARY CENTER TAB
  // =========================================================================
  private renderVocabularyTab(container: HTMLElement): void {
    const allVocab = this.plugin.vaultScanner.getAllVocabulary();
    const dueInfo = this.plugin.srsService.getDueVocabulary(allVocab);

    const headerRow = container.createDiv({ cls: 'eh-section-header' });
    headerRow.createEl('h2', { text: 'Vocabulary Center' });

    const btnGroup = headerRow.createDiv({ cls: 'eh-btn-group' });
    const addBtn = btnGroup.createEl('button', { text: '+ Add New Vocabulary', cls: 'mod-cta' });
    addBtn.addEventListener('click', () => {
      new AddVocabModal(this.app, this.plugin.dataService, this.plugin.settings.currentLevel, () => {
        this.render();
      }).open();
    });

    const reviewDueBtn = btnGroup.createEl('button', {
      text: `Review Due Words (${dueInfo.due.length})`
    });
    reviewDueBtn.addEventListener('click', () => {
      if (dueInfo.due.length === 0) {
        new Notice('No vocabulary words are due for review right now!');
        return;
      }
      new NativeReviewModal(
        this.app,
        dueInfo.due.map(item => ({ kind: 'vocab', item })),
        this.plugin.srsService,
        () => this.render()
      ).open();
    });

    // Summary stats bar
    const statsBar = container.createDiv({ cls: 'eh-vocab-stats-bar eh-glass-card' });
    const counts = {
      total: allVocab.length,
      newWords: allVocab.filter(v => v.status === 'new').length,
      dueWords: dueInfo.due.length,
      difficultWords: allVocab.filter(v => v.status === 'difficult').length,
      masteredWords: allVocab.filter(v => v.status === 'mastered').length
    };

    statsBar.createDiv({ text: `Total Saved: ${counts.total}`, cls: 'eh-stat-pill' });
    statsBar.createDiv({ text: `New: ${counts.newWords}`, cls: 'eh-stat-pill' });
    statsBar.createDiv({ text: `Due for Review: ${counts.dueWords}`, cls: 'eh-stat-pill eh-pill-accent' });
    statsBar.createDiv({ text: `Difficult: ${counts.difficultWords}`, cls: 'eh-stat-pill eh-pill-warn' });
    statsBar.createDiv({ text: `Mastered: ${counts.masteredWords}`, cls: 'eh-stat-pill eh-pill-success' });

    // Filters & Search Bar
    const filterBar = container.createDiv({ cls: 'eh-filter-bar eh-glass-card' });
    const searchInput = filterBar.createEl('input', {
      type: 'text',
      placeholder: 'Search word, meaning, translation, or category...',
      cls: 'eh-search-input'
    });
    searchInput.value = this.vocabSearchQuery;
    searchInput.addEventListener('input', () => {
      this.vocabSearchQuery = searchInput.value;
      this.renderVocabList(listContainer, allVocab);
    });

    const levelSelect = filterBar.createEl('select', { cls: 'dropdown' });
    for (const opt of ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
      levelSelect.createEl('option', { text: opt === 'ALL' ? 'All CEFR Levels' : opt, value: opt });
    }
    levelSelect.value = this.vocabLevelFilter;
    levelSelect.addEventListener('change', () => {
      this.vocabLevelFilter = levelSelect.value;
      this.renderVocabList(listContainer, allVocab);
    });

    const statusSelect = filterBar.createEl('select', { cls: 'dropdown' });
    for (const st of ['ALL', 'new', 'learning', 'review', 'difficult', 'mastered']) {
      statusSelect.createEl('option', { text: st === 'ALL' ? 'All Statuses' : st.toUpperCase(), value: st });
    }
    statusSelect.value = this.vocabStatusFilter;
    statusSelect.addEventListener('change', () => {
      this.vocabStatusFilter = statusSelect.value;
      this.renderVocabList(listContainer, allVocab);
    });

    const sortSelect = filterBar.createEl('select', { cls: 'dropdown' });
    sortSelect.createEl('option', { text: 'Sort by Word (A-Z)', value: 'word' });
    sortSelect.createEl('option', { text: 'Sort by CEFR Level', value: 'level' });
    sortSelect.createEl('option', { text: 'Sort by Next Review Date', value: 'nextReview' });
    sortSelect.value = this.vocabSortBy;
    sortSelect.addEventListener('change', () => {
      this.vocabSortBy = sortSelect.value as 'word' | 'level' | 'nextReview';
      this.renderVocabList(listContainer, allVocab);
    });

    const listContainer = container.createDiv({ cls: 'eh-vocab-list-container' });
    this.renderVocabList(listContainer, allVocab);
  }

  private renderVocabList(container: HTMLElement, allVocab: VocabItem[]): void {
    container.empty();
    const q = this.vocabSearchQuery.toLowerCase().trim();

    const filtered = allVocab
      .filter(v => {
        if (this.vocabLevelFilter !== 'ALL' && v.level !== this.vocabLevelFilter) return false;
        if (this.vocabStatusFilter !== 'ALL' && v.status !== this.vocabStatusFilter) return false;
        if (!q) return true;
        return (
          v.word.toLowerCase().includes(q) ||
          v.meaning.toLowerCase().includes(q) ||
          v.translation.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (this.vocabSortBy === 'level') return a.level.localeCompare(b.level);
        if (this.vocabSortBy === 'nextReview') return (a.nextReview || '').localeCompare(b.nextReview || '');
        return a.word.localeCompare(b.word);
      });

    if (filtered.length === 0) {
      container.createDiv({ text: 'No vocabulary entries match the current filters.', cls: 'eh-empty-state' });
      return;
    }

    const grid = container.createDiv({ cls: 'eh-vocab-cards-grid' });
    for (const v of filtered) {
      const card = grid.createDiv({ cls: 'eh-vocab-card eh-glass-card' });
      const top = card.createDiv({ cls: 'eh-vocab-card-top' });
      top.createEl('h3', { text: v.word });

      const badges = top.createDiv({ cls: 'eh-badge-row' });
      badges.createSpan({ text: v.level, cls: 'eh-badge eh-badge-accent' });
      badges.createSpan({ text: v.status, cls: 'eh-badge' });

      card.createEl('p', { text: v.meaning, cls: 'eh-vocab-meaning' });
      if (v.translation) {
        const tr = card.createEl('p', { text: v.translation, cls: 'eh-vocab-translation' });
        if (containsPersianOrArabic(v.translation)) tr.setAttribute('dir', 'rtl');
      }
      if (v.example) {
        card.createEl('blockquote', { text: v.example });
      }

      const footer = card.createDiv({ cls: 'eh-vocab-card-footer' });
      footer.createSpan({
        text: `Category: ${v.category} • Next Review: ${v.nextReview} (${v.reps} reps)`,
        cls: 'eh-muted'
      });

      const actions = footer.createDiv({ cls: 'eh-btn-group' });
      if (v.filePath) {
        const openBtn = actions.createEl('button', { text: 'Open Note', cls: 'eh-btn-sm' });
        openBtn.addEventListener('click', async () => {
          const abstract = this.app.vault.getAbstractFileByPath(v.filePath);
          if (abstract && abstract instanceof TFile) {
            await this.app.workspace.getLeaf(false).openFile(abstract);
          } else {
            new Notice(`File not found: ${v.filePath}`);
          }
        });
      } else {
        const createNoteBtn = actions.createEl('button', { text: 'Create Note', cls: 'eh-btn-sm' });
        createNoteBtn.addEventListener('click', async () => {
          v.filePath = await this.plugin.dataService.createVocabularyMarkdownNote(v);
          await this.plugin.dataService.saveLocalDatabase();
          this.render();
        });
      }
    }
  }

  // =========================================================================
  // 3. REVIEW CENTER TAB
  // =========================================================================
  private renderReviewTab(container: HTMLElement): void {
    const allVocab = this.plugin.vaultScanner.getAllVocabulary();
    const dueVocab = this.plugin.srsService.getDueVocabulary(allVocab);
    const dueCards = this.plugin.srsService.getDueReviewCards();

    const totalDue = dueVocab.due.length + dueCards.due.length;
    const totalOverdue = dueVocab.overdue.length + dueCards.overdue.length;
    const todayReviews = this.plugin.dataService.data.reviewHistory.filter(r => r.date === getTodayISO()).length;

    container.createEl('h2', { text: 'Centralized Review Center' });

    const metricsRow = container.createDiv({ cls: 'eh-overview-grid' });
    const summaryItems = [
      { label: 'Due Today', val: String(totalDue), sub: 'Ready for spaced repetition' },
      { label: 'Overdue Items', val: String(totalOverdue), sub: 'Past scheduled review date' },
      { label: 'Reviewed Today', val: String(todayReviews), sub: 'Completed flashcards today' },
      {
        label: 'Total Review History',
        val: String(this.plugin.dataService.data.reviewHistory.length),
        sub: 'Lifetime graded reviews'
      }
    ];
    for (const s of summaryItems) {
      const c = metricsRow.createDiv({ cls: 'eh-metric-card eh-glass-card' });
      c.createDiv({ text: s.label, cls: 'eh-metric-label' });
      c.createDiv({ text: s.val, cls: 'eh-metric-value' });
      c.createDiv({ text: s.sub, cls: 'eh-metric-sub' });
    }

    // Native Review Queues
    if (this.plugin.settings.enableNativeSRS) {
      const nativeSec = container.createDiv({ cls: 'eh-glass-card eh-section-card' });
      nativeSec.createEl('h3', { text: 'Native Spaced-Repetition Queues (SM-2)' });
      const decksGrid = nativeSec.createDiv({ cls: 'eh-review-decks-grid' });

      const grammarCards = dueCards.due.filter(c => c.type === 'grammar');
      const sentenceCards = dueCards.due.filter(c => c.type === 'sentence');
      const mistakeCards = dueCards.due.filter(c => c.type === 'mistake');

      const decks = [
        {
          title: 'Vocabulary Review',
          count: dueVocab.due.length,
          desc: 'Review due vocabulary words from your vault & hub.',
          run: () =>
            new NativeReviewModal(
              this.app,
              dueVocab.due.map(item => ({ kind: 'vocab', item })),
              this.plugin.srsService,
              () => this.render()
            ).open()
        },
        {
          title: 'Grammar Review',
          count: grammarCards.length,
          desc: 'Practice syntax rules, tenses, and structures.',
          run: () =>
            new NativeReviewModal(
              this.app,
              grammarCards.map(item => ({ kind: 'card', item })),
              this.plugin.srsService,
              () => this.render()
            ).open()
        },
        {
          title: 'Sentence Review',
          count: sentenceCards.length,
          desc: 'Paraphrasing, inversions, and sentence transformations.',
          run: () =>
            new NativeReviewModal(
              this.app,
              sentenceCards.map(item => ({ kind: 'card', item })),
              this.plugin.srsService,
              () => this.render()
            ).open()
        },
        {
          title: 'Mistake Review',
          count: mistakeCards.length,
          desc: 'Correct common errors and fossilized mistakes.',
          run: () =>
            new NativeReviewModal(
              this.app,
              mistakeCards.map(item => ({ kind: 'card', item })),
              this.plugin.srsService,
              () => this.render()
            ).open()
        },
        {
          title: 'Random Mixed Review',
          count: allVocab.length + this.plugin.dataService.data.reviewCards.length,
          desc: 'Cram 10 random vocabulary & grammar items anytime.',
          run: () => {
            const combined = [
              ...allVocab.map(item => ({ kind: 'vocab' as const, item })),
              ...this.plugin.dataService.data.reviewCards.map(item => ({ kind: 'card' as const, item }))
            ]
              .sort(() => Math.random() - 0.5)
              .slice(0, 10);
            new NativeReviewModal(this.app, combined, this.plugin.srsService, () => this.render()).open();
          }
        }
      ];

      for (const d of decks) {
        const card = decksGrid.createDiv({ cls: 'eh-deck-card' });
        card.createEl('h4', { text: d.title });
        card.createSpan({ text: `${d.count} available`, cls: 'eh-badge eh-badge-accent' });
        card.createEl('p', { text: d.desc, cls: 'eh-muted' });
        const startBtn = card.createEl('button', { text: 'Start Session', cls: 'mod-cta' });
        startBtn.addEventListener('click', () => {
          if (d.count === 0) {
            new Notice(`No items due in ${d.title}!`);
            return;
          }
          d.run();
        });
      }
    }

    // External Plugin Review Command Integrations
    const extSec = container.createDiv({ cls: 'eh-glass-card eh-section-card' });
    extSec.createEl('h3', { text: 'External Obsidian Plugin Review Integrations' });
    extSec.createEl('p', {
      text: 'Trigger review commands from installed Obsidian plugins (Spaced Repetition, Anki, Flashcards, etc.) via app.commands.executeCommandById().',
      cls: 'eh-muted'
    });
    this.renderQuickActionsWidget(extSec, true);
  }

  // =========================================================================
  // 4. GRAMMAR CENTER TAB
  // =========================================================================
  private renderGrammarTab(container: HTMLElement): void {
    const topics = this.plugin.vaultScanner.getAllGrammarTopics();
    const completedCount = topics.filter(t => t.completed).length;

    const header = container.createDiv({ cls: 'eh-section-header' });
    header.createEl('h2', { text: `Grammar Center (${completedCount}/${topics.length} Completed)` });

    const categories: ('ALL' | GrammarCategory)[] = [
      'ALL',
      'Tenses',
      'Sentence Structures',
      'Questions & Negatives',
      'Modal Verbs',
      'Conditionals',
      'Prepositions',
      'Articles',
      'Common Mistakes'
    ];

    const catBar = container.createDiv({ cls: 'eh-category-pills' });
    for (const cat of categories) {
      const pill = catBar.createEl('button', {
        text: cat,
        cls: `eh-pill-btn ${this.grammarCategoryFilter === cat ? 'is-active' : ''}`
      });
      pill.addEventListener('click', () => {
        this.grammarCategoryFilter = cat;
        this.render();
      });
    }

    const filtered = topics.filter(
      t => this.grammarCategoryFilter === 'ALL' || t.category === this.grammarCategoryFilter
    );

    const grid = container.createDiv({ cls: 'eh-grammar-grid' });
    for (const topic of filtered) {
      const card = grid.createDiv({ cls: 'eh-grammar-card eh-glass-card' });
      const top = card.createDiv({ cls: 'eh-vocab-card-top' });
      top.createEl('h4', { text: topic.title });
      const badges = top.createDiv({ cls: 'eh-badge-row' });
      badges.createSpan({ text: topic.level, cls: 'eh-badge eh-badge-accent' });
      badges.createSpan({ text: topic.category, cls: 'eh-badge' });

      const barTrack = card.createDiv({ cls: 'eh-progress-bar-track' });
      const barFill = barTrack.createDiv({ cls: 'eh-progress-bar-fill' });
      barFill.style.width = `${topic.completed ? 100 : topic.progress}%`;

      const footer = card.createDiv({ cls: 'eh-vocab-card-footer' });
      const toggleBtn = footer.createEl('button', {
        text: topic.completed ? 'Completed ✓' : 'Mark Complete',
        cls: topic.completed ? 'eh-btn-success eh-btn-sm' : 'eh-btn-sm'
      });
      toggleBtn.addEventListener('click', async () => {
        const dbTopic = this.plugin.dataService.data.grammarTopics.find(
          g => g.id === topic.id || g.title.toLowerCase() === topic.title.toLowerCase()
        );
        if (dbTopic) {
          dbTopic.completed = !topic.completed;
          dbTopic.progress = dbTopic.completed ? 100 : 50;
        } else {
          this.plugin.dataService.data.grammarTopics.push({
            ...topic,
            completed: !topic.completed,
            progress: !topic.completed ? 100 : 50
          });
        }
        await this.plugin.dataService.saveLocalDatabase();
        this.render();
      });

      if (topic.notePath) {
        const openBtn = footer.createEl('button', { text: 'Open Grammar Note', cls: 'eh-btn-sm mod-cta' });
        openBtn.addEventListener('click', async () => {
          const f = this.app.vault.getAbstractFileByPath(topic.notePath);
          if (f && f instanceof TFile) {
            await this.app.workspace.getLeaf(false).openFile(f);
          } else {
            new Notice('Linked grammar note not found in vault.');
          }
        });
      }
    }
  }

  // =========================================================================
  // 5. FOUR ENGLISH SKILLS TAB
  // =========================================================================
  private renderSkillsTab(container: HTMLElement): void {
    const header = container.createDiv({ cls: 'eh-section-header' });
    header.createEl('h2', { text: 'Four Core English Skills' });

    const subNav = container.createDiv({ cls: 'eh-category-pills' });
    const skills: { id: 'reading' | 'listening' | 'speaking' | 'writing'; label: string }[] = [
      { id: 'reading', label: 'Reading' },
      { id: 'listening', label: 'Listening' },
      { id: 'speaking', label: 'Speaking' },
      { id: 'writing', label: 'Writing' }
    ];

    for (const sk of skills) {
      const btn = subNav.createEl('button', {
        text: sk.label,
        cls: `eh-pill-btn ${this.activeSkillSubTab === sk.id ? 'is-active' : ''}`
      });
      btn.addEventListener('click', () => {
        this.activeSkillSubTab = sk.id;
        this.render();
      });
    }

    const active = this.activeSkillSubTab;
    const weeklyMins = this.plugin.analyticsService.getSkillMinutes(active, true);
    const totalMins = this.plugin.analyticsService.getSkillMinutes(active, false);
    const goalMap = {
      reading: this.plugin.settings.readingGoalMinutesWeekly,
      listening: this.plugin.settings.listeningGoalMinutesWeekly,
      speaking: this.plugin.settings.speakingGoalMinutesWeekly,
      writing: this.plugin.settings.writingGoalMinutesWeekly
    };
    const weeklyGoal = goalMap[active];

    const summaryCard = container.createDiv({ cls: 'eh-skill-hero eh-glass-card' });
    createProgressRing(summaryCard, (weeklyMins / weeklyGoal) * 100, 76, 7);

    const heroInfo = summaryCard.createDiv({ cls: 'eh-skill-hero-info' });
    heroInfo.createEl('h3', { text: `${active.toUpperCase()} Practice & Analytics` });
    heroInfo.createEl('p', {
      text: `Weekly Progress: ${weeklyMins}m / ${weeklyGoal}m • Lifetime Total: ${formatMinutes(totalMins)}`
    });

    const logBtn = summaryCard.createEl('button', {
      text: `+ Log ${active.charAt(0).toUpperCase() + active.slice(1)} Session`,
      cls: 'mod-cta'
    });
    logBtn.addEventListener('click', () => {
      new LogSkillSessionModal(this.app, this.plugin.dataService, active, () => this.render()).open();
    });

    const sessions = this.plugin.dataService.data.sessions.filter(s => s.category === active);
    const historyWrap = container.createDiv({ cls: 'eh-sessions-list' });
    if (sessions.length === 0) {
      historyWrap.createDiv({
        text: `No ${active} sessions recorded yet. Click "+ Log Session" or use the Study Timer!`,
        cls: 'eh-empty-state'
      });
      return;
    }

    for (const sess of sessions) {
      const item = historyWrap.createDiv({ cls: 'eh-session-card eh-glass-card' });
      const top = item.createDiv({ cls: 'eh-vocab-card-top' });
      top.createEl('h4', { text: sess.title });
      top.createSpan({ text: `${sess.date} • ${sess.durationMinutes}m`, cls: 'eh-badge eh-badge-accent' });
      item.createEl('p', { text: `Resource / Topic: ${sess.resourceOrTopic}`, cls: 'eh-muted' });
      if (sess.notes) {
        item.createEl('p', { text: sess.notes });
      }
      if (sess.correctionsOrExpressions) {
        item.createEl('blockquote', { text: sess.correctionsOrExpressions });
      }
    }
  }

  // =========================================================================
  // 6. STUDY PLANNER TAB
  // =========================================================================
  private renderPlannerTab(container: HTMLElement): void {
    container.createEl('h2', { text: 'Study Planner & Learning Routines' });

    // Add task form
    const addBar = container.createDiv({ cls: 'eh-filter-bar eh-glass-card' });
    const titleIn = addBar.createEl('input', {
      type: 'text',
      placeholder: 'New learning goal or routine task...',
      cls: 'eh-search-input'
    });
    const horizonSelect = addBar.createEl('select', { cls: 'dropdown' });
    horizonSelect.createEl('option', { text: 'Daily Goal', value: 'daily' });
    horizonSelect.createEl('option', { text: 'Weekly Goal', value: 'weekly' });
    horizonSelect.createEl('option', { text: 'Monthly Goal', value: 'monthly' });

    const routineLabel = addBar.createEl('label', { cls: 'eh-inline-checkbox' });
    const routineCheck = routineLabel.createEl('input', { type: 'checkbox' });
    routineLabel.createSpan({ text: 'Recurring Routine' });

    const addTaskBtn = addBar.createEl('button', { text: '+ Add Task', cls: 'mod-cta' });
    addTaskBtn.addEventListener('click', async () => {
      if (!titleIn.value.trim()) return;
      this.plugin.dataService.data.tasks.unshift({
        id: `task-${Date.now()}`,
        title: titleIn.value.trim(),
        category: 'vocabulary',
        horizon: horizonSelect.value as 'daily' | 'weekly' | 'monthly',
        completed: false,
        dueDate: getTodayISO(),
        isRoutine: routineCheck.checked
      });
      await this.plugin.dataService.saveLocalDatabase();
      this.render();
    });

    const columns = container.createDiv({ cls: 'eh-planner-columns' });
    const horizons: { id: 'daily' | 'weekly' | 'monthly'; title: string }[] = [
      { id: 'daily', title: 'Daily Learning Goals' },
      { id: 'weekly', title: 'Weekly Learning Goals' },
      { id: 'monthly', title: 'Monthly Learning Goals' }
    ];

    for (const h of horizons) {
      const col = columns.createDiv({ cls: 'eh-planner-col eh-glass-card' });
      col.createEl('h3', { text: h.title });
      const tasks = this.plugin.dataService.data.tasks.filter(t => t.horizon === h.id);

      for (const task of tasks) {
        const row = col.createDiv({ cls: `eh-checklist-item ${task.completed ? 'is-done' : ''}` });
        const cb = row.createEl('input', { type: 'checkbox' });
        cb.checked = task.completed;
        cb.addEventListener('change', async () => {
          task.completed = cb.checked;
          await this.plugin.dataService.saveLocalDatabase();
          this.render();
        });
        row.createSpan({ text: task.title, cls: 'eh-checklist-title' });
        if (task.isRoutine) {
          row.createSpan({ text: 'Routine', cls: 'eh-badge' });
        }
        const delBtn = row.createEl('button', { text: '×', cls: 'eh-icon-btn' });
        delBtn.addEventListener('click', async () => {
          this.plugin.dataService.data.tasks = this.plugin.dataService.data.tasks.filter(x => x.id !== task.id);
          await this.plugin.dataService.saveLocalDatabase();
          this.render();
        });
      }
    }
  }

  // =========================================================================
  // 7. STUDY TIMER TAB
  // =========================================================================
  private renderTimerTab(container: HTMLElement): void {
    const t = this.plugin.timerService;
    const card = container.createDiv({ cls: 'eh-timer-full-card eh-glass-card' });
    card.createEl('h2', { text: 'Dedicated English Study Timer' });

    const modePills = card.createDiv({ cls: 'eh-category-pills' });
    const modes: { id: typeof t.mode; label: string }[] = [
      { id: 'pomodoro', label: `Pomodoro (${this.plugin.settings.pomodoroWorkMinutes}m)` },
      { id: 'short-break', label: `Short Break (${this.plugin.settings.pomodoroShortBreakMinutes}m)` },
      { id: 'long-break', label: `Long Break (${this.plugin.settings.pomodoroLongBreakMinutes}m)` },
      { id: 'custom', label: 'Custom Duration' }
    ];

    for (const m of modes) {
      const btn = modePills.createEl('button', {
        text: m.label,
        cls: `eh-pill-btn ${t.mode === m.id ? 'is-active' : ''}`
      });
      btn.addEventListener('click', () => {
        t.resetToMode(m.id);
        this.render();
      });
    }

    const configRow = card.createDiv({ cls: 'eh-timer-config-row' });
    const catSelect = configRow.createEl('select', { cls: 'dropdown' });
    for (const c of ['reading', 'listening', 'speaking', 'writing', 'vocabulary', 'grammar']) {
      catSelect.createEl('option', { text: c.toUpperCase(), value: c });
    }
    catSelect.value = t.category;
    catSelect.addEventListener('change', () => {
      t.category = catSelect.value as SkillCategory;
    });

    const topicInput = configRow.createEl('input', {
      type: 'text',
      placeholder: 'Session topic (logged automatically on finish)...',
      cls: 'eh-search-input'
    });
    topicInput.value = t.sessionTopic;
    topicInput.addEventListener('input', () => {
      t.sessionTopic = topicInput.value;
    });

    const clockDisplay = card.createDiv({ cls: 'eh-timer-clock-hero' });
    this.timerDisplayEl = clockDisplay.createDiv({
      text: t.getFormattedRemaining(),
      cls: 'eh-timer-digits-lg'
    });

    const btnRow = card.createDiv({ cls: 'eh-btn-group eh-center-row' });
    if (!t.isRunning) {
      const startBtn = btnRow.createEl('button', {
        text: t.isPaused ? 'Resume Timer' : 'Start Timer',
        cls: 'mod-cta'
      });
      startBtn.addEventListener('click', () => {
        t.startTimer();
        this.render();
      });
    } else {
      const pauseBtn = btnRow.createEl('button', { text: 'Pause Timer' });
      pauseBtn.addEventListener('click', () => {
        t.pauseTimer();
        this.render();
      });
    }

    const stopBtn = btnRow.createEl('button', { text: 'Stop & Log Elapsed Time' });
    stopBtn.addEventListener('click', () => {
      t.stopTimer(true);
      this.render();
    });
  }

  // =========================================================================
  // 8. STATISTICS & ANALYTICS TAB
  // =========================================================================
  private renderAnalyticsTab(container: HTMLElement): void {
    const allVocab = this.plugin.vaultScanner.getAllVocabulary();
    const allGrammar = this.plugin.vaultScanner.getAllGrammarTopics();

    container.createEl('h2', { text: 'Statistics, Heatmap & Skill Analytics' });

    const topStats = container.createDiv({ cls: 'eh-overview-grid' });
    const cards = [
      { label: 'Today Study Time', val: formatMinutes(this.plugin.analyticsService.getTodayStudyMinutes()) },
      { label: 'Weekly Study Time', val: formatMinutes(this.plugin.analyticsService.getWeeklyStudyMinutes()) },
      { label: 'Monthly Study Time', val: formatMinutes(this.plugin.analyticsService.getMonthlyStudyMinutes()) },
      { label: 'Current Streak', val: `${this.plugin.analyticsService.getCurrentStreak()} days` }
    ];
    for (const c of cards) {
      const box = topStats.createDiv({ cls: 'eh-metric-card eh-glass-card' });
      box.createDiv({ text: c.label, cls: 'eh-metric-label' });
      box.createDiv({ text: c.val, cls: 'eh-metric-value' });
    }

    const heatSec = container.createDiv({ cls: 'eh-glass-card eh-section-card' });
    heatSec.createEl('h3', { text: '12-Week Learning Activity Heatmap' });
    this.renderHeatmapWidget(heatSec);

    const distSec = container.createDiv({ cls: 'eh-glass-card eh-section-card' });
    distSec.createEl('h3', { text: 'Skill Time Distribution' });
    const total = Math.max(1, this.plugin.analyticsService.getTotalStudyMinutes());
    const skillCats: SkillCategory[] = ['reading', 'listening', 'speaking', 'writing', 'vocabulary', 'grammar'];

    for (const sc of skillCats) {
      const mins = this.plugin.analyticsService.getSkillMinutes(sc, false);
      const pct = Math.round((mins / total) * 100);
      const row = distSec.createDiv({ cls: 'eh-dist-row' });
      row.createSpan({ text: `${sc.toUpperCase()} (${formatMinutes(mins)} • ${pct}%)`, cls: 'eh-dist-label' });
      const track = row.createDiv({ cls: 'eh-progress-bar-track' });
      const fill = track.createDiv({ cls: 'eh-progress-bar-fill' });
      fill.style.width = `${pct}%`;
    }

    if (this.plugin.settings.enableGamification) {
      const achSec = container.createDiv({ cls: 'eh-glass-card eh-section-card' });
      achSec.createEl('h3', { text: 'Achievements & Milestones' });
      this.renderAchievementsWidget(achSec, allVocab, allGrammar);
    }
  }
}
