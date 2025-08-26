/**
 * ASVAB Prep - Military-Grade JavaScript Framework
 * Serving those who serve - Global CDN Optimized
 * 
 * Core application functionality for military education excellence
 */

// Military Application State Management
class ASVABApp {
  constructor() {
    this.user = null;
    this.currentBranch = null;
    this.subscriptionTier = 'free';
    this.currentQuiz = null;
    this.performance = new PerformanceTracker();
    
    this.init();
  }

  init() {
    this.loadUserSession();
    this.setupEventListeners();
    this.initializeMilitaryTheme();
    this.startPerformanceTracking();
    
    console.log('🎖️ ASVAB Prep Application Initialized - Serving Military Excellence');
  }

  // User Authentication & Session Management
  loadUserSession() {
    const sessionData = localStorage.getItem('asvab_session');
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        this.user = session.user;
        this.currentBranch = session.branch;
        this.subscriptionTier = session.subscription || 'free';
        this.applyMilitaryTheme(this.currentBranch);
      } catch (error) {
        console.error('Failed to load user session:', error);
        this.clearSession();
      }
    }
  }

  saveUserSession() {
    const sessionData = {
      user: this.user,
      branch: this.currentBranch,
      subscription: this.subscriptionTier,
      timestamp: Date.now()
    };
    localStorage.setItem('asvab_session', JSON.stringify(sessionData));
  }

  clearSession() {
    localStorage.removeItem('asvab_session');
    this.user = null;
    this.currentBranch = null;
    this.subscriptionTier = 'free';
  }

  // Military Branch Theme System
  initializeMilitaryTheme() {
    const themes = {
      ARMY: {
        name: 'Army',
        greeting: 'Hooah!',
        motto: 'Army Strong',
        colors: ['#4B5320', '#FFD700'],
        rank: 'Soldier'
      },
      NAVY: {
        name: 'Navy',
        greeting: 'Hooyah!',
        motto: 'Anchors Aweigh',
        colors: ['#000080', '#FFD700'],
        rank: 'Sailor'
      },
      MARINES: {
        name: 'Marines',
        greeting: 'Oorah!',
        motto: 'Semper Fi',
        colors: ['#DC143C', '#FFD700'],
        rank: 'Marine'
      },
      AIR_FORCE: {
        name: 'Air Force',
        greeting: 'Hoorah!',
        motto: 'Aim High',
        colors: ['#00308F', '#FFD700'],
        rank: 'Airman'
      },
      COAST_GUARD: {
        name: 'Coast Guard',
        greeting: 'Hooyah!',
        motto: 'Semper Paratus',
        colors: ['#FF8C00', '#000080'],
        rank: 'Coastie'
      },
      SPACE_FORCE: {
        name: 'Space Force',
        greeting: 'Hoorah!',
        motto: 'Semper Supra',
        colors: ['#1a1a2e', '#16213e'],
        rank: 'Guardian'
      }
    };

    this.militaryThemes = themes;
  }

  applyMilitaryTheme(branch) {
    if (!branch || !this.militaryThemes[branch]) return;

    const theme = this.militaryThemes[branch];
    const root = document.documentElement;

    // Apply CSS custom properties for theming
    root.style.setProperty('--primary-color', theme.colors[0]);
    root.style.setProperty('--accent-color', theme.colors[1]);
    
    // Update body class for theme-specific styles
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${branch.toLowerCase()}`);

    // Update greeting elements
    const greetingElements = document.querySelectorAll('[data-military-greeting]');
    greetingElements.forEach(el => {
      el.textContent = theme.greeting;
    });

    // Update rank references
    const rankElements = document.querySelectorAll('[data-military-rank]');
    rankElements.forEach(el => {
      el.textContent = theme.rank;
    });

    // Update motto elements
    const mottoElements = document.querySelectorAll('[data-military-motto]');
    mottoElements.forEach(el => {
      el.textContent = theme.motto;
    });

    this.currentBranch = branch;
    this.saveUserSession();
  }

  // Quiz Management System
  startQuiz(category, difficulty = 'medium') {
    this.currentQuiz = new QuizSession(category, difficulty, this.subscriptionTier);
    this.currentQuiz.onComplete = (results) => {
      this.handleQuizCompletion(results);
    };
    this.currentQuiz.start();
  }

  handleQuizCompletion(results) {
    // Save performance data
    this.performance.recordQuizResults(results);
    
    // Check for achievements
    this.checkAchievements(results);
    
    // Update progress
    this.updateUserProgress(results);
    
    // Send analytics (if enabled)
    this.sendAnalytics('quiz_completed', results);
  }

  // Performance Tracking
  updateUserProgress(results) {
    const progress = JSON.parse(localStorage.getItem('asvab_progress') || '{}');
    
    if (!progress[results.category]) {
      progress[results.category] = {
        questionsAnswered: 0,
        correctAnswers: 0,
        averageScore: 0,
        bestScore: 0,
        totalTime: 0
      };
    }

    const categoryProgress = progress[results.category];
    categoryProgress.questionsAnswered += results.totalQuestions;
    categoryProgress.correctAnswers += results.correctAnswers;
    categoryProgress.averageScore = (categoryProgress.correctAnswers / categoryProgress.questionsAnswered) * 100;
    categoryProgress.bestScore = Math.max(categoryProgress.bestScore, results.score);
    categoryProgress.totalTime += results.timeSpent;

    localStorage.setItem('asvab_progress', JSON.stringify(progress));
    this.displayProgressUpdate(results.category, categoryProgress);
  }

  displayProgressUpdate(category, progress) {
    const notification = new MilitaryNotification({
      title: `${category} Progress Update`,
      message: `Average Score: ${progress.averageScore.toFixed(1)}% | Best: ${progress.bestScore}%`,
      type: 'success',
      icon: '📊',
      duration: 4000
    });
    notification.show();
  }

  // Achievement System
  checkAchievements(results) {
    const achievements = [
      {
        id: 'first_quiz',
        title: 'Boot Camp Graduate',
        description: 'Complete your first quiz',
        condition: () => results.isFirstQuiz
      },
      {
        id: 'perfect_score',
        title: 'Marksman',
        description: 'Score 100% on any quiz',
        condition: () => results.score === 100
      },
      {
        id: 'speed_demon',
        title: 'Lightning Round',
        description: 'Complete a quiz in under 2 minutes',
        condition: () => results.timeSpent < 120
      },
      {
        id: 'category_master',
        title: 'Subject Matter Expert',
        description: 'Score above 90% in any category 5 times',
        condition: () => this.checkCategoryMastery(results.category, 90, 5)
      }
    ];

    achievements.forEach(achievement => {
      if (achievement.condition() && !this.hasAchievement(achievement.id)) {
        this.unlockAchievement(achievement);
      }
    });
  }

  unlockAchievement(achievement) {
    const unlockedAchievements = JSON.parse(localStorage.getItem('asvab_achievements') || '[]');
    unlockedAchievements.push({
      ...achievement,
      unlockedAt: Date.now()
    });
    localStorage.setItem('asvab_achievements', JSON.stringify(unlockedAchievements));

    // Show achievement notification
    const notification = new MilitaryNotification({
      title: 'Achievement Unlocked! 🎖️',
      message: `${achievement.title}: ${achievement.description}`,
      type: 'achievement',
      duration: 6000
    });
    notification.show();

    // Play achievement sound (if enabled)
    this.playAchievementSound();
  }

  // Subscription Management
  checkPremiumFeature(feature) {
    if (this.subscriptionTier === 'premium') return true;
    
    const freeFeatures = [
      'basic_quizzes',
      'limited_questions',
      'basic_explanations'
    ];
    
    if (freeFeatures.includes(feature)) return true;
    
    this.showPremiumUpgradePrompt(feature);
    return false;
  }

  showPremiumUpgradePrompt(feature) {
    const modal = new MilitaryModal({
      title: '🎖️ Premium Feature Required',
      content: `
        <p>This feature requires a Premium subscription.</p>
        <p>Upgrade to access unlimited questions, advanced explanations, and military job insights!</p>
        <div class="premium-benefits">
          <ul>
            <li>✓ Unlimited practice questions</li>
            <li>✓ Detailed answer explanations</li>
            <li>✓ Military job database</li>
            <li>✓ Progress analytics</li>
            <li>✓ Study groups</li>
          </ul>
        </div>
      `,
      buttons: [
        { text: 'Upgrade Now', action: () => this.redirectToUpgrade(), primary: true },
        { text: 'Maybe Later', action: () => modal.close() }
      ]
    });
    modal.show();
  }

  // Event System
  setupEventListeners() {
    // Quiz navigation
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-start-quiz]')) {
        const category = e.target.dataset.category;
        const difficulty = e.target.dataset.difficulty || 'medium';
        this.startQuiz(category, difficulty);
      }
      
      if (e.target.matches('[data-branch-select]')) {
        const branch = e.target.dataset.branch;
        this.applyMilitaryTheme(branch);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Quick navigation for quiz questions
      if (this.currentQuiz && this.currentQuiz.isActive) {
        if (e.key >= '1' && e.key <= '4') {
          const answerIndex = parseInt(e.key) - 1;
          this.currentQuiz.selectAnswer(answerIndex);
        }
        if (e.key === 'Enter') {
          this.currentQuiz.submitAnswer();
        }
        if (e.key === 'Escape') {
          this.currentQuiz.pause();
        }
      }
    });

    // Handle visibility change for performance optimization
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performance.pauseTracking();
        if (this.currentQuiz) this.currentQuiz.pause();
      } else {
        this.performance.resumeTracking();
        if (this.currentQuiz) this.currentQuiz.resume();
      }
    });
  }

  // Analytics & Reporting
  sendAnalytics(event, data) {
    if (!this.analyticsEnabled) return;
    
    // Send to analytics service
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.user?.token}`
      },
      body: JSON.stringify({
        event,
        data: {
          ...data,
          branch: this.currentBranch,
          subscription: this.subscriptionTier,
          timestamp: Date.now()
        }
      })
    }).catch(error => {
      console.warn('Analytics request failed:', error);
    });
  }

  // Utility Methods
  playAchievementSound() {
    try {
      const audio = new Audio('/sounds/achievement.wav');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play failures (autoplay restrictions)
      });
    } catch (error) {
      // Audio not available
    }
  }

  showMilitaryGreeting(branch) {
    if (!branch || !this.militaryThemes[branch]) return;
    
    const theme = this.militaryThemes[branch];
    const greeting = `${theme.greeting} Welcome back, ${theme.rank}! ${theme.motto}`;
    
    const notification = new MilitaryNotification({
      title: `${theme.name} Portal`,
      message: greeting,
      type: 'info',
      duration: 3000
    });
    notification.show();
  }
}

// Quiz Session Management
class QuizSession {
  constructor(category, difficulty, subscriptionTier) {
    this.category = category;
    this.difficulty = difficulty;
    this.subscriptionTier = subscriptionTier;
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.answers = [];
    this.startTime = null;
    this.isActive = false;
    this.onComplete = null;
  }

  async start() {
    try {
      this.questions = await this.loadQuestions();
      this.startTime = Date.now();
      this.isActive = true;
      this.displayQuestion();
    } catch (error) {
      console.error('Failed to start quiz:', error);
    }
  }

  async loadQuestions() {
    const response = await fetch(`/api/questions?category=${this.category}&difficulty=${this.difficulty}&limit=${this.getQuestionLimit()}`);
    if (!response.ok) throw new Error('Failed to load questions');
    return response.json();
  }

  getQuestionLimit() {
    // Free tier limitations
    if (this.subscriptionTier === 'free') {
      return Math.min(10, 50); // Max 10 questions for free users
    }
    return 30; // Premium users get full quizzes
  }

  displayQuestion() {
    const question = this.questions[this.currentQuestionIndex];
    if (!question) {
      this.complete();
      return;
    }

    const questionContainer = document.getElementById('question-container');
    if (!questionContainer) return;

    questionContainer.innerHTML = `
      <div class="question-card fade-in">
        <div class="question-header">
          <span class="question-number">${this.currentQuestionIndex + 1}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${(this.currentQuestionIndex / this.questions.length) * 100}%"></div>
          </div>
        </div>
        <h3 class="question-text">${question.content}</h3>
        <div class="answer-options">
          ${question.options.map((option, index) => `
            <div class="answer-option" data-answer-index="${index}">
              <input type="radio" name="answer" value="${index}" id="answer-${index}">
              <label for="answer-${index}">${option}</label>
            </div>
          `).join('')}
        </div>
        <div class="question-actions">
          <button class="btn btn-secondary" onclick="app.currentQuiz.previousQuestion()">Previous</button>
          <button class="btn btn-primary" onclick="app.currentQuiz.submitAnswer()">Submit</button>
        </div>
      </div>
    `;
  }

  selectAnswer(answerIndex) {
    const answerOptions = document.querySelectorAll('.answer-option');
    answerOptions.forEach(option => option.classList.remove('selected'));
    
    const selectedOption = answerOptions[answerIndex];
    if (selectedOption) {
      selectedOption.classList.add('selected');
      selectedOption.querySelector('input').checked = true;
    }
  }

  submitAnswer() {
    const selectedAnswer = document.querySelector('input[name="answer"]:checked');
    if (!selectedAnswer) {
      alert('Please select an answer before continuing.');
      return;
    }

    this.answers.push({
      questionIndex: this.currentQuestionIndex,
      selectedAnswer: parseInt(selectedAnswer.value),
      timeSpent: Date.now() - (this.questionStartTime || Date.now())
    });

    this.nextQuestion();
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.questionStartTime = Date.now();
    this.displayQuestion();
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.displayQuestion();
    }
  }

  pause() {
    this.isActive = false;
    // Show pause overlay
  }

  resume() {
    this.isActive = true;
    // Hide pause overlay
  }

  complete() {
    this.isActive = false;
    const results = this.calculateResults();
    
    if (this.onComplete) {
      this.onComplete(results);
    }
    
    this.displayResults(results);
  }

  calculateResults() {
    const correctAnswers = this.answers.filter((answer, index) => {
      return answer.selectedAnswer === this.questions[index].correctAnswer;
    }).length;

    const totalTime = Date.now() - this.startTime;
    
    return {
      category: this.category,
      difficulty: this.difficulty,
      totalQuestions: this.questions.length,
      correctAnswers,
      score: Math.round((correctAnswers / this.questions.length) * 100),
      timeSpent: Math.round(totalTime / 1000),
      answers: this.answers,
      isFirstQuiz: !localStorage.getItem('asvab_progress')
    };
  }

  displayResults(results) {
    const container = document.getElementById('question-container');
    const performanceMessage = this.getPerformanceMessage(results.score);
    
    container.innerHTML = `
      <div class="quiz-results fade-in">
        <div class="results-header">
          <h2>🎖️ Mission Complete!</h2>
          <div class="score-display">
            <span class="score-number">${results.score}%</span>
            <span class="score-fraction">${results.correctAnswers}/${results.totalQuestions}</span>
          </div>
        </div>
        <div class="performance-message">
          <p>${performanceMessage}</p>
        </div>
        <div class="results-stats">
          <div class="stat">
            <span class="stat-label">Time</span>
            <span class="stat-value">${this.formatTime(results.timeSpent)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Category</span>
            <span class="stat-value">${results.category}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Difficulty</span>
            <span class="stat-value">${results.difficulty}</span>
          </div>
        </div>
        <div class="results-actions">
          <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
          <button class="btn btn-secondary" onclick="app.showDetailedResults()">Review Answers</button>
        </div>
      </div>
    `;
  }

  getPerformanceMessage(score) {
    if (score >= 90) return "Outstanding performance! You're ready for the real ASVAB! 🎖️";
    if (score >= 80) return "Excellent work! You're well-prepared for military service! 🎯";
    if (score >= 70) return "Good job! Keep practicing to improve your scores. 📚";
    if (score >= 60) return "Not bad! Focus on your weak areas for better results. 💪";
    return "Keep studying! Every military professional started somewhere. 🚀";
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Military-themed Notification System
class MilitaryNotification {
  constructor(options) {
    this.title = options.title;
    this.message = options.message;
    this.type = options.type || 'info';
    this.icon = options.icon || this.getDefaultIcon(this.type);
    this.duration = options.duration || 5000;
  }

  getDefaultIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      achievement: '🎖️'
    };
    return icons[type] || 'ℹ️';
  }

  show() {
    const notification = document.createElement('div');
    notification.className = `notification notification-${this.type} slide-up`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.icon}</span>
        <div class="notification-text">
          <strong class="notification-title">${this.title}</strong>
          <p class="notification-message">${this.message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    const container = this.getNotificationContainer();
    container.appendChild(notification);

    if (this.duration > 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, this.duration);
    }
  }

  getNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-container';
      document.body.appendChild(container);
    }
    return container;
  }
}

// Performance Tracking
class PerformanceTracker {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      quizStartTime: 0,
      totalStudyTime: 0,
      questionsAnswered: 0,
      averageResponseTime: 0
    };
    this.isTracking = false;
  }

  start() {
    this.isTracking = true;
    this.recordPageLoad();
  }

  recordPageLoad() {
    if (performance.timing) {
      this.metrics.pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    }
  }

  recordQuizResults(results) {
    this.metrics.questionsAnswered += results.totalQuestions;
    this.metrics.totalStudyTime += results.timeSpent;
    
    const avgResponseTime = results.answers.reduce((sum, answer) => sum + answer.timeSpent, 0) / results.answers.length;
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime + avgResponseTime) / 2;
  }

  pauseTracking() {
    this.isTracking = false;
  }

  resumeTracking() {
    this.isTracking = true;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Initialize Application
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ASVABApp();
  
  // Show military greeting if user has a selected branch
  if (app.currentBranch) {
    setTimeout(() => {
      app.showMilitaryGreeting(app.currentBranch);
    }, 1000);
  }
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Application error:', event.error);
  
  const notification = new MilitaryNotification({
    title: 'System Alert',
    message: 'An unexpected error occurred. Our team has been notified.',
    type: 'error',
    duration: 5000
  });
  notification.show();
});

// Service Worker registration for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ASVABApp, QuizSession, MilitaryNotification, PerformanceTracker };
}