/* ============================================================
 * DevQuiz — features/settings/account.ts
 * Cloudflare Account & Progress Cloud Sync UI (Enhanced UI/UX).
 * ============================================================ */

import { h } from '../../components/hyperscript.js';
import { button } from '../../components/button.js';
import { toast } from '../../components/toast.js';
import { store, type AppState } from '../../state.js';
import {
  clearAuthSession,
  getApiBaseUrl,
  loginApi,
  performFullSync,
  registerApi,
  saveAuthSession,
  setApiBaseUrl,
} from '../../storage.js';
import { faNum } from '../../types.js';
import { platform } from '../../platform/index.js';

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 30) return 'چند لحظه پیش';
  if (diffSec < 60) return `${faNum(diffSec)} ثانیه پیش`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${faNum(diffMin)} دقیقه پیش`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${faNum(diffHours)} ساعت پیش`;
  const diffDays = Math.floor(diffHours / 24);
  return `${faNum(diffDays)} روز پیش`;
}

export function renderAccountSection(state: AppState): DocumentFragment {
  const frag = document.createDocumentFragment();

  frag.appendChild(h('h3', { className: 'section-title' }, 'حساب کاربری و همگام‌سازی ابری'));

  const card = h('div', { className: 'settings-card account-card' });

  if (state.authUser) {
    // ----------------------------------------------------
    // Authenticated: Beautiful User Profile Card
    // ----------------------------------------------------
    const user = state.authUser;
    const initial = (user.name || user.email || 'ک')[0]?.toUpperCase() || 'U';

    const profileTop = h(
      'div',
      { className: 'profile-header' },
      h(
        'div',
        { className: 'profile-avatar-wrap' },
        h('div', { className: 'profile-avatar' }, initial),
        h('span', { className: 'profile-online-badge', attrs: { title: 'متصل به سرور لبه Cloudflare' } }),
      ),
      h(
        'div',
        { className: 'profile-identity' },
        h(
          'div',
          { className: 'profile-name-row' },
          h('span', { className: 'profile-name' }, user.name || 'کاربر DevQuiz'),
          h('span', { className: 'profile-verified-badge' }, '✓ همگام'),
        ),
        h('div', { className: 'profile-email' }, user.email),
      ),
    );
    card.appendChild(profileTop);

    // Stats Grid
    const statsGrid = h(
      'div',
      { className: 'profile-stats-grid' },
      h(
        'div',
        { className: 'profile-stat-item' },
        h('span', { className: 'profile-stat-icon' }, '⚡'),
        h('span', { className: 'profile-stat-value' }, `${faNum(state.gamification?.xp || 0)} XP`),
        h('span', { className: 'profile-stat-label' }, 'مجموع امتیاز'),
      ),
      h(
        'div',
        { className: 'profile-stat-item' },
        h('span', { className: 'profile-stat-icon' }, '🔥'),
        h('span', { className: 'profile-stat-value' }, `${faNum(state.gamification?.streak || 0)} روز`),
        h('span', { className: 'profile-stat-label' }, 'زنجیره پیوسته'),
      ),
      h(
        'div',
        { className: 'profile-stat-item' },
        h('span', { className: 'profile-stat-icon' }, '☁️'),
        h('span', { className: 'profile-stat-value' }, 'Cloudflare D1'),
        h('span', { className: 'profile-stat-label' }, 'پایگاه داده لبه'),
      ),
    );
    card.appendChild(statsGrid);

    // Sync Status Bar
    const lastSyncText = state.lastSyncedAt
      ? `آخرین همگام‌سازی: ${formatRelativeTime(state.lastSyncedAt)}`
      : 'همگام‌سازی خودکار در جریان است.';

    const syncBar = h(
      'div',
      { className: 'profile-sync-bar' },
      h(
        'div',
        { className: 'sync-status-indicator' },
        h('span', { className: `sync-dot ${state.isSyncing ? 'sync-dot--pulsing' : 'sync-dot--active'}` }),
        h('span', { className: 'sync-meta-text' }, state.isSyncing ? 'در حال همگام‌سازی با سرور...' : lastSyncText),
      ),
    );
    card.appendChild(syncBar);

    // Actions Row
    const actions = h('div', { className: 'profile-actions-row' });

    const syncBtn = button(
      state.isSyncing ? 'در حال ارسال و دریافت... ⏳' : 'همگام‌سازی ابری اکنون 🔄',
      async () => {
        syncBtn.disabled = true;
        toast('در حال تبادل اطلاعات با Cloudflare D1...', { kind: 'info' });
        const res = await performFullSync();
        syncBtn.disabled = false;
        if (res.success) {
          const autoMsg =
            res.autoDownloadedCount && res.autoDownloadedCount > 0
              ? ` (${faNum(res.autoDownloadedCount)} موضوع خودکار دانلود شد)`
              : '';
          toast(`همگام‌سازی با موفقیت انجام شد (${faNum(res.syncedCount)} مورد)${autoMsg}`, { kind: 'success' });
        } else {
          toast(res.error || 'خطا در همگام‌سازی.', { kind: 'error' });
        }
      },
      { variant: 'primary', disabled: state.isSyncing, className: 'btn--sync-action' },
    );

    const logoutBtn = button(
      'خروج از حساب',
      async () => {
        if (!confirm('آیا مایل به خروج از حساب کاربری هستید؟ داده‌های محلی فعلی شما حفظ می‌شوند.')) {
          return;
        }
        await clearAuthSession();
        store.dispatch({ type: 'SET_AUTH', user: null, token: null });
        toast('با موفقیت از حساب خارج شدید.', { kind: 'info' });
      },
      { variant: 'ghost', className: 'btn--logout-action' },
    );

    actions.appendChild(syncBtn);
    actions.appendChild(logoutBtn);
    card.appendChild(actions);
  } else {
    // ----------------------------------------------------
    // Unauthenticated: Sleek Login & Register Flow
    // ----------------------------------------------------
    let mode: 'login' | 'register' = 'login';

    const heroBanner = h(
      'div',
      { className: 'auth-hero-banner' },
      h(
        'div',
        { className: 'auth-badge-pill' },
        h('span', { className: 'auth-badge-dot' }),
        'سرور ابری لبه Cloudflare',
      ),
      h('h4', { className: 'auth-hero-title' }, 'همگام‌سازی و ذخیره ابری پیشرفت'),
      h(
        'p',
        { className: 'auth-hero-desc' },
        'با حساب رایگان DevQuiz، سوالات مطالعه‌شده، امتیازات و کارت‌های شما در همه دستگاه‌ها محفوظ می‌ماند.',
      ),
    );
    card.appendChild(heroBanner);

    // Segmented Tab Switcher
    const navTabs = h('div', { className: 'auth-tabs' });
    const tabLogin = h(
      'button',
      {
        type: 'button',
        className: 'auth-tab auth-tab--active',
        onClick: () => switchMode('login'),
      },
      '🔑 ورود به حساب',
    );
    const tabRegister = h(
      'button',
      {
        type: 'button',
        className: 'auth-tab',
        onClick: () => switchMode('register'),
      },
      '✨ ساخت حساب جدید',
    );

    navTabs.appendChild(tabLogin);
    navTabs.appendChild(tabRegister);
    card.appendChild(navTabs);

    const form = h('form', {
      className: 'auth-form',
      onSubmit: (e) => {
        e.preventDefault();
        void handleSubmit();
      },
    });

    // Name input group (Register only)
    const nameGroup = h('div', { className: 'auth-field-group auth-field-group--name', style: { display: 'none' } });
    const nameLabel = h('label', { className: 'auth-field-label', attrs: { for: 'auth-name' } }, 'نام نمایشی');
    const nameInputWrap = h('div', { className: 'auth-input-wrap' });
    const nameIcon = h('span', { className: 'auth-input-icon' }, '👤');
    const nameInput = h('input', {
      type: 'text',
      id: 'auth-name',
      className: 'auth-input',
      attrs: { placeholder: 'مثال: علی رضایی' },
    }) as HTMLInputElement;
    nameInputWrap.appendChild(nameIcon);
    nameInputWrap.appendChild(nameInput);
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInputWrap);

    // Email input group
    const emailGroup = h('div', { className: 'auth-field-group' });
    const emailLabel = h('label', { className: 'auth-field-label', attrs: { for: 'auth-email' } }, 'ایمیل');
    const emailInputWrap = h('div', { className: 'auth-input-wrap' });
    const emailIcon = h('span', { className: 'auth-input-icon' }, '✉️');
    const emailInput = h('input', {
      type: 'email',
      id: 'auth-email',
      className: 'auth-input',
      attrs: { placeholder: 'name@example.com', dir: 'ltr', required: '' },
    }) as HTMLInputElement;
    emailInputWrap.appendChild(emailIcon);
    emailInputWrap.appendChild(emailInput);
    emailGroup.appendChild(emailLabel);
    emailGroup.appendChild(emailInputWrap);

    // Password input group
    const passGroup = h('div', { className: 'auth-field-group' });
    const passLabel = h('label', { className: 'auth-field-label', attrs: { for: 'auth-pass' } }, 'رمز عبور (حداقل ۶ کاراکتر)');
    const passInputWrap = h('div', { className: 'auth-input-wrap' });
    const passIcon = h('span', { className: 'auth-input-icon' }, '🔒');
    const passInput = h('input', {
      type: 'password',
      id: 'auth-pass',
      className: 'auth-input',
      attrs: { placeholder: '••••••••', dir: 'ltr', required: '' },
    }) as HTMLInputElement;
    const togglePassBtn = h(
      'button',
      {
        type: 'button',
        className: 'auth-pass-toggle',
        attrs: { 'aria-label': 'نمایش یا پنهان کردن رمز' },
        onClick: () => {
          if (passInput.type === 'password') {
            passInput.type = 'text';
            togglePassBtn.textContent = '🙈';
          } else {
            passInput.type = 'password';
            togglePassBtn.textContent = '👁️';
          }
        },
      },
      '👁️',
    );
    passInputWrap.appendChild(passIcon);
    passInputWrap.appendChild(passInput);
    passInputWrap.appendChild(togglePassBtn);
    passGroup.appendChild(passLabel);
    passGroup.appendChild(passInputWrap);

    // Honeypot input (invisible to real users, catches spam bots)
    const honeypotInput = h('input', {
      type: 'text',
      id: 'auth-website',
      className: 'auth-hp',
      attrs: {
        name: 'website',
        tabindex: '-1',
        autocomplete: 'off',
        'aria-hidden': 'true',
      },
      style: {
        position: 'absolute',
        opacity: '0',
        pointerEvents: 'none',
        height: '0',
        width: '0',
        margin: '0',
        padding: '0',
      },
    }) as HTMLInputElement;

    const hintText = h(
      'div',
      { className: 'auth-hint-text' },
      '⚡ ثبت‌نام ۱۰۰٪ رایگان و آنی بدون نیاز به ایمیل تاییدیه',
    );

    const errorBox = h('div', { className: 'auth-error-box', style: { display: 'none' } });

    const submitBtn = button(
      'ورود به حساب کاربری',
      () => void handleSubmit(),
      { variant: 'primary', className: 'btn--auth-action' },
    );
    submitBtn.type = 'submit';

    form.appendChild(honeypotInput);
    form.appendChild(nameGroup);
    form.appendChild(emailGroup);
    form.appendChild(passGroup);
    form.appendChild(hintText);
    form.appendChild(errorBox);
    form.appendChild(submitBtn);
    card.appendChild(form);

    function switchMode(newMode: 'login' | 'register'): void {
      mode = newMode;
      errorBox.style.display = 'none';
      errorBox.textContent = '';
      if (mode === 'login') {
        tabLogin.classList.add('auth-tab--active');
        tabRegister.classList.remove('auth-tab--active');
        nameGroup.style.display = 'none';
        submitBtn.textContent = 'ورود به حساب کاربری';
      } else {
        tabRegister.classList.add('auth-tab--active');
        tabLogin.classList.remove('auth-tab--active');
        nameGroup.style.display = 'block';
        submitBtn.textContent = 'ثبت‌نام و ورود آنی';
      }
    }

    async function handleSubmit(): Promise<void> {
      const email = emailInput.value.trim();
      const password = passInput.value.trim();
      const name = nameInput.value.trim();

      if (!email || !email.includes('@')) {
        showError('لطفاً یک آدرس ایمیل معتبر وارد کنید.');
        return;
      }
      if (!password || password.length < 6) {
        showError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
        return;
      }

      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      const prevText = submitBtn.textContent;
      submitBtn.textContent = 'در حال ارتباط با سرور...';

      try {
        let authSession: { user: { id: string; email: string; name: string }; token: string };
        const website = honeypotInput.value;
        if (mode === 'login') {
          authSession = await loginApi(email, password);
        } else {
          authSession = await registerApi(email, password, name || undefined, {
            website: website || undefined,
          });
        }

        await saveAuthSession(authSession.user, authSession.token);
        store.dispatch({
          type: 'SET_AUTH',
          user: authSession.user,
          token: authSession.token,
        });

        toast(`خوش آمدید ${authSession.user.name} 🎉`, { kind: 'success' });

        // Trigger initial cloud sync
        void performFullSync().then((res) => {
          if (res.success) {
            if (res.autoDownloadedCount && res.autoDownloadedCount > 0) {
              toast(
                `پیشرفت شما همگام شد و ${faNum(res.autoDownloadedCount)} موضوع به‌طور خودکار دانلود شدند 🚀`,
                { kind: 'success' },
              );
            } else if (res.syncedCount > 0) {
              toast(`پیشرفت شما با سرور ابری همگام شد (${faNum(res.syncedCount)} کارت)`, { kind: 'success' });
            }
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطا در برقراری ارتباط با سرور.';
        showError(msg);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = prevText;
      }
    }

    function showError(msg: string): void {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    }

    // ----------------------------------------------------
    // Advanced: Custom Server URL Setting
    // ----------------------------------------------------
    const advancedDetails = h('details', { className: 'auth-advanced-details' });
    const summary = h('summary', { className: 'auth-advanced-summary' }, 'تنظیمات سرور Cloudflare (اختیاری)');
    const advContent = h('div', { className: 'auth-advanced-content' });

    const urlLabel = h('label', { className: 'auth-field-label', attrs: { for: 'api-url-input' } }, 'آدرس سرور API');
    const urlInput = h('input', {
      type: 'url',
      id: 'api-url-input',
      className: 'auth-input',
      attrs: { placeholder: 'آدرس ورکر Cloudflare', dir: 'ltr' },
    }) as HTMLInputElement;

    void getApiBaseUrl().then((url) => {
      urlInput.value = url;
    });

    const saveUrlBtn = button('ذخیره آدرس سرور', async () => {
      await setApiBaseUrl(urlInput.value);
      toast('آدرس سرور اختصاصی ذخیره شد.', { kind: 'success' });
    }, { variant: 'soft', className: 'btn--sm' });

    advContent.appendChild(urlLabel);
    advContent.appendChild(urlInput);
    advContent.appendChild(saveUrlBtn);

    advancedDetails.appendChild(summary);
    advancedDetails.appendChild(advContent);
    card.appendChild(advancedDetails);
  }

  frag.appendChild(card);
  return frag;
}
