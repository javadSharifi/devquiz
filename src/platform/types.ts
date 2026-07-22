/* ============================================================
 * DevQuiz — platform/types.ts
 * The single contract every platform adapter implements.
 * App code MUST import only from `platform/index.js`; it must
 * never touch `chrome.*`, `browser.*`, or `localStorage` directly.
 * ============================================================ */

export type AlarmName = string;
export type PlatformName = 'chrome' | 'firefox' | 'web';

export interface AlarmInfo {
  /** First fire delay in minutes. */
  delayInMinutes?: number;
  /** Recurring period in minutes. */
  periodInMinutes?: number;
}

export interface AlarmHandle {
  name: AlarmName;
  scheduledTime: number;
  periodInMinutes?: number;
}

export interface InstalledDetails {
  reason: 'install' | 'update' | 'chrome_update' | 'shared_module_update' | 'browser_update';
  previousVersion?: string;
}

export interface StorageAdapter {
  get<T>(key: string, fallback: T): Promise<T>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface AlarmsAdapter {
  create(name: AlarmName, info: AlarmInfo): Promise<void>;
  get(name: AlarmName): Promise<AlarmHandle | undefined>;
  clear(name: AlarmName): Promise<boolean>;
  onAlarm(cb: (alarm: AlarmHandle) => void): void;
}

export interface RuntimeAdapter {
  getURL(path: string): string;
  onInstalled(cb: (details: InstalledDetails) => void): void;
  onStartup(cb: () => void): void;
}

export interface ActionAdapter {
  setBadgeText(details: { text: string }): Promise<void>;
  setBadgeBackgroundColor(details: { color: string }): Promise<void>;
}

export interface TabsAdapter {
  create(details: { url: string; active?: boolean }): Promise<unknown>;
}

export interface PlatformAdapter {
  readonly name: PlatformName;
  readonly isExtension: boolean;
  storage: {
    local: StorageAdapter;
    sync: StorageAdapter;
  };
  alarms: AlarmsAdapter;
  runtime: RuntimeAdapter;
  action: ActionAdapter;
  tabs: TabsAdapter;
}
