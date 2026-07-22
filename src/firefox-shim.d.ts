/* ============================================================
 * DevQuiz — firefox-shim.d.ts
 * Minimal ambient typings for the browser.* APIs the Firefox
 * adapter uses. Mirrors the chrome-shim surface so the adapter
 * code is symmetric. Drop this file and add
 * `"types": ["firefox-webext-browser"]` to tsconfig.json once
 * that package is installed.
 * ============================================================ */

declare namespace browser {
  namespace storage {
    interface StorageArea {
      get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
      clear(): Promise<void>;
    }
    const local: StorageArea;
    const sync: StorageArea;
  }

  namespace alarms {
    interface Alarm {
      name: string;
      scheduledTime: number;
      periodInMinutes?: number;
    }
    interface AlarmCreateInfo {
      when?: number;
      delayInMinutes?: number;
      periodInMinutes?: number;
    }
    function create(name: string, alarmInfo: AlarmCreateInfo): Promise<void>;
    function get(name: string): Promise<Alarm | undefined>;
    function clear(name: string): Promise<boolean>;
    const onAlarm: {
      addListener(callback: (alarm: Alarm) => void): void;
    };
  }

  namespace action {
    function setBadgeText(details: { text: string }): Promise<void>;
    function setBadgeBackgroundColor(details: { color: string }): Promise<void>;
  }

  namespace runtime {
    interface InstalledDetails {
      reason?: 'install' | 'update' | 'browser_update';
      previousVersion?: string;
    }
    function getURL(path: string): string;
    const onInstalled: {
      addListener(callback: (details: InstalledDetails) => void): void;
    };
    const onStartup: {
      addListener(callback: () => void): void;
    };
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
    }
    function create(createProperties: { url: string; active?: boolean }): Promise<Tab>;
  }
}
