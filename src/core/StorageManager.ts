import { IGameSaveData } from './CelestialData';

export class StorageManager {
  private static readonly STORAGE_KEY = 'cosmic-merge:save:v1';
  private memBackup: IGameSaveData = {
    highScore: 0,
    unlockedTiers: [1, 2, 3, 4],
    totalMerges: 0,
    soundEnabled: true,
    schemaVersion: 1
  };

  public load(): IGameSaveData {
    try {
      const raw = localStorage.getItem(StorageManager.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.highScore === 'number' && Array.isArray(parsed.unlockedTiers)) {
          // 確保 Tier 1~4 預設解鎖
          const tiers = Array.from(new Set([...(parsed.unlockedTiers || []), 1, 2, 3, 4])).sort((a, b) => a - b);
          this.memBackup = {
            highScore: Math.max(0, parsed.highScore || 0),
            unlockedTiers: tiers,
            totalMerges: Math.max(0, parsed.totalMerges || 0),
            soundEnabled: parsed.soundEnabled !== false,
            schemaVersion: 1
          };
          return this.memBackup;
        }
      }
    } catch {
      // 私密瀏覽或 iframe 配額限制時，靜默使用記憶體備份
    }
    return { ...this.memBackup };
  }

  public save(data: IGameSaveData): void {
    this.memBackup = { ...data };
    try {
      localStorage.setItem(StorageManager.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 靜默處理儲存配額異常
    }
  }

  public updateHighScore(score: number): boolean {
    const current = this.load();
    if (score > current.highScore) {
      current.highScore = score;
      this.save(current);
      return true;
    }
    return false;
  }

  public unlockTier(tier: number): boolean {
    const current = this.load();
    if (!current.unlockedTiers.includes(tier)) {
      current.unlockedTiers.push(tier);
      current.unlockedTiers.sort((a, b) => a - b);
      this.save(current);
      return true;
    }
    return false;
  }

  public incrementMerges(): void {
    const current = this.load();
    current.totalMerges += 1;
    this.save(current);
  }

  public setSoundEnabled(enabled: boolean): void {
    const current = this.load();
    current.soundEnabled = enabled;
    this.save(current);
  }
}
