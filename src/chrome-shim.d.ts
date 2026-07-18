/* ============================================================
 * DevQuiz — chrome-shim.d.ts
 * Minimal ambient typings for the chrome.* APIs this extension
 * uses. This shim exists because the project must compile even
 * without network access to install @types/chrome.
 *
 * If you `npm install` (which brings in @types/chrome), DELETE
 * this file and add `"types": ["chrome"]` to tsconfig.json to
 * use the full official typings instead.
 * ============================================================ */

declare namespace chrome {
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
    const onAlarm: {
      addListener(callback: (alarm: Alarm) => void): void;
    };
  }

  namespace action {
    function setBadgeText(details: { text: string }): Promise<void>;
    function setBadgeBackgroundColor(details: { color: string }): Promise<void>;
  }

  namespace runtime {
    enum OnInstalledReason {
      INSTALL = 'install',
      UPDATE = 'update',
      CHROME_UPDATE = 'chrome_update',
      SHARED_MODULE_UPDATE = 'shared_module_update',
    }
    interface InstalledDetails {
      reason: OnInstalledReason;
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
