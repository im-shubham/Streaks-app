/**
 * Pure state machine for press-and-hold. Time is injected so it is unit-testable.
 * Completes at most once per press; any cancel path resets progress.
 */
export interface Hold {
  start(now: number): void;
  tick(now: number): number; // returns progress 0..1; fires onComplete once when it reaches 1
  cancel(): void;
  readonly active: boolean;
}

export function createHold(duration: number, onComplete: () => void): Hold {
  let t0: number | null = null;
  let done = false;
  return {
    start(now) {
      if (t0 !== null || done) return; // ignore repeated pointerdown / key-repeat
      t0 = now;
    },
    tick(now) {
      if (t0 === null) return 0;
      const p = Math.min(1, (now - t0) / duration);
      if (p >= 1 && !done) {
        done = true;
        t0 = null;
        onComplete();
      }
      return p;
    },
    cancel() {
      t0 = null;
      done = false;
    },
    get active() {
      return t0 !== null;
    },
  };
}
