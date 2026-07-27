export interface TypingAnomalyEvent {
  type: "suspicious_typing" | "unnatural_typing";
  description: string;
}

export class TypingAnalyzer {
  private keyTimestamps: number[] = [];
  private textBuffer = "";
  private lastFlagTime = 0;
  private onAnomalyCallback: ((event: TypingAnomalyEvent) => void) | null = null;

  onAnomaly(callback: (event: TypingAnomalyEvent) => void) {
    this.onAnomalyCallback = callback;
  }

  /**
   * Called on every keydown or input change event in essay/proof textareas
   */
  recordKeystroke(currentText: string) {
    const now = performance.now();
    this.keyTimestamps.push(now);
    this.textBuffer = currentText;

    // Maintain a rolling window of the last 60 seconds of keystrokes
    const windowStart = now - 60_000;
    this.keyTimestamps = this.keyTimestamps.filter((t) => t >= windowStart);

    // Cooldown check (don't spam flags more than once every 45 seconds)
    if (now - this.lastFlagTime < 45_000) return;

    this.analyzeCadence(now);
  }

  private analyzeCadence(now: number) {
    const text = this.textBuffer;
    if (text.length < 40) return; // Need minimum sample size

    // Count LaTeX and mathematical symbols
    const latexSymbolCount = (text.match(/\\[a-zA-Z]+|\{|\}|\^|_|=|\+|\/|\*|<|>/g) || []).length;
    const totalChars = text.length;
    const latexDensity = latexSymbolCount / (totalChars || 1);

    // 1. Calculate Characters Per Minute (CPM) over the last 30 seconds
    const recentKeys = this.keyTimestamps.filter((t) => t >= now - 30_000);
    const cpm = recentKeys.length * 2; // scale to 60s
    const wpm = cpm / 5;

    // 2. Anomaly Rule 1: High LaTeX Speed
    // If text has significant LaTeX (>15% LaTeX math symbols) and typing speed > 35 WPM (or > 175 CPM)
    if (latexDensity > 0.15 && wpm > 35) {
      this.lastFlagTime = now;
      this.emitAnomaly({
        type: "suspicious_typing",
        description: `Unnaturally high LaTeX typing speed detected (${Math.round(wpm)} WPM with high mathematical symbol density)`,
      });
      return;
    }

    // 3. Anomaly Rule 2: Unnatural Uniform Burst without Deliberation Pauses
    // Check key interval variance over last 20 keystrokes
    if (recentKeys.length >= 25) {
      const intervals: number[] = [];
      for (let i = 1; i < recentKeys.length; i++) {
        intervals.push(recentKeys[i] - recentKeys[i - 1]);
      }

      // Average inter-key delay
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      // Standard deviation of inter-key delays
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // Human typists thinking through math proofs have high stdDev (long pauses followed by quick bursts).
      // Machine/Phone copiers typing fixed rhythm have very low stdDev (< 35ms variance at rapid speeds).
      if (avgInterval < 220 && stdDev < 30) {
        this.lastFlagTime = now;
        this.emitAnomaly({
          type: "unnatural_typing",
          description: "Unnatural uniform typing cadence detected (burst typing without deliberation pauses)",
        });
      }
    }
  }

  private emitAnomaly(event: TypingAnomalyEvent) {
    if (this.onAnomalyCallback) {
      this.onAnomalyCallback(event);
    }
  }
}
