/* ============================================================
 * DevQuiz — services/storage/mutex.ts
 * Lightweight async Mutex for read-modify-write serialization.
 * ============================================================ */

export class Mutex {
  #queue: (() => void)[] = [];
  #locked = false;
  #timeoutId: ReturnType<typeof setTimeout> | null = null;

  acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      let released = false;

      const release = (): void => {
        if (released) return;
        released = true;
        if (this.#timeoutId !== null) {
          clearTimeout(this.#timeoutId);
          this.#timeoutId = null;
        }
        if (this.#queue.length > 0) {
          const next = this.#queue.shift()!;
          this.#locked = true;
          next();
        } else {
          this.#locked = false;
        }
      };

      const start = (): void => {
        this.#locked = true;
        this.#timeoutId = setTimeout(() => {
          release();
        }, 5000);
        resolve(release);
      };

      if (!this.#locked) {
        start();
      } else {
        this.#queue.push(() => {
          start();
        });
      }
    });
  }
}
