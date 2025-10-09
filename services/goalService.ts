// services/goalService.ts

import localforage from 'localforage';
import { WritingGoal, GoalProgress } from '@/models/statistics';
import { JournalEntry } from '@/models/entry';

// 生成 UUID
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const GOALS_KEY = 'writing_goals';

class GoalService {
  private goals: WritingGoal[] = [];
  private loaded = false;

  /**
   * 加载所有目标
   */
  async loadGoals(): Promise<WritingGoal[]> {
    if (this.loaded) {
      return this.goals;
    }

    try {
      const stored = await localforage.getItem<WritingGoal[]>(GOALS_KEY);
      this.goals = stored || [];
      this.loaded = true;
      return this.goals;
    } catch (error) {
      console.error('Failed to load goals:', error);
      return [];
    }
  }

  /**
   * 创建新目标
   */
  async createGoal(
    type: 'daily' | 'weekly' | 'monthly',
    target: number,
    unit: 'entries' | 'words'
  ): Promise<WritingGoal> {
    const newGoal: WritingGoal = {
      id: generateId(),
      type,
      target,
      unit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.goals.push(newGoal);
    await localforage.setItem(GOALS_KEY, this.goals);

    return newGoal;
  }

  /**
   * 更新目标
   */
  async updateGoal(id: string, updates: Partial<Omit<WritingGoal, 'id'>>): Promise<WritingGoal | null> {
    const index = this.goals.findIndex(g => g.id === id);
    if (index === -1) return null;

    this.goals[index] = {
      ...this.goals[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await localforage.setItem(GOALS_KEY, this.goals);
    return this.goals[index];
  }

  /**
   * 删除目标
   */
  async deleteGoal(id: string): Promise<boolean> {
    const initialLength = this.goals.length;
    this.goals = this.goals.filter(g => g.id !== id);

    if (this.goals.length !== initialLength) {
      await localforage.setItem(GOALS_KEY, this.goals);
      return true;
    }

    return false;
  }

  /**
   * 计算目标进度
   */
  calculateProgress(goal: WritingGoal, entries: JournalEntry[]): GoalProgress {
    const now = new Date();
    const range = this.getDateRange(goal.type, now);
    const relevantEntries = entries.filter(e => {
      if (e.archived || e.deleted) {
        return false;
      }
      const entryDate = new Date(e.createdAt);
      return entryDate >= range.start && entryDate <= range.end;
    });

    let current = 0;
    if (goal.unit === 'entries') {
      current = relevantEntries.length;
    } else if (goal.unit === 'words') {
      current = relevantEntries.reduce((total, entry) => {
        const text = this.htmlToText(entry.html || '');
        if (text.trim() === '') {
          return total;
        }
        const words = text.trim().split(/\s+/).length;
        return total + words;
      }, 0);
    }

    const percentage = goal.target > 0 ? Math.min((current / goal.target) * 100, 100) : 0;
    const remaining = Math.max(0, goal.target - current);

    return {
      goal,
      current,
      percentage,
      remaining,
      isCompleted: current >= goal.target
    };
  }

  private getDateRange(type: 'daily' | 'weekly' | 'monthly', now: Date): { start: Date, end: Date } {
    const start = new Date(now);
    const end = new Date(now);

    switch (type) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
    }
    return { start, end };
  }

  /**
   * HTML 转纯文本
   */
  private htmlToText(html: string): string {
    if (typeof document === 'undefined') return html;

    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * 获取所有目标的进度
   */
  async getAllProgress(entries: JournalEntry[]): Promise<GoalProgress[]> {
    const goals = await this.loadGoals();
    return goals.map(goal => this.calculateProgress(goal, entries));
  }
}

export const goalService = new GoalService();
