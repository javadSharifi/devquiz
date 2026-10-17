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
import { ICON, icon, settingsSection } from './section.js';

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

export function renderAccountSection(state: AppState): HTMLElement {
  const card = h('div', { className: `account-card${state.authUser ? ' account-card--hero' : ' st-card st-card--pad'}` });

  if (state.authUser) {
    // ----------------------------------------------------
    // Authenticated: Beautiful User Profile Card
    // ----------------------------------------------------
    const user = state.authUser;
    const initial = (user.name || user.email || 'ک')[0]?.toUpperCase() || 'U';

    card.appendChild(
      h(
        'div',
        { className: 'profile-header' },
        h('div', { className: 'profile-avatar' }, initial),
        h(
          'div',
          { className: 'profile-identity' },
          h('span', { className: 'profile-name' }, user.name || 'کاربر DevQuiz'),
          h('span', { className: 'profile-email' }, user.email),
        ),
        h('span', { className: 'profile-verified-badge' }, h('span', { className: 'sync-dot' }), 'همگام'),
      ),
    );

    card.appendChild(
      h(
        'div',
        { className: 'profile-stats-grid' },
        h(
          'div',
          { className: 'profile-stat-item profile-stat-item--xp' },
          h('span', { className: 'profile-stat-value' }, faNum(state.gamification?.xp || 0)),
          h('span', { className: 'profile-stat-label' }, 'امتیاز XP'),
        ),
        h(
          'div',
          { className: 'profile-stat-item profile-stat-item--streak' },
          h('span', { className: 'profile-stat-value' }, `${faNum(state.gamification?.streak || 0)} روز`),
          h('span', { className: 'profile-stat-label' }, 'زنجیره پیوسته'),
        ),
      ),
    );

    const lastSyncText = state.lastSyncedAt
      ? `آخرین همگام‌سازی: ${formatRelativeTime(state.lastSyncedAt)}`
      : 'همگام‌سازی خودکار در جریان است.';

    const syncBtn = button(
      [icon(ICON.sync, 16), state.isSyncing ? 'در حال همگام‌سازی…' : 'همگام‌سازی اکنون'],
      async () => {
        syncBtn.disabled = true;
        toast('در حال تبادل اطلاعات با سرور...', { kind: 'info' });
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
      [icon(ICON.logout, 16), 'خروج'],
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

    card.appendChild(h('div', { className: 'profile-actions-row' }, syncBtn, logoutBtn));
    card.appendChild(
      h('span', { className: `profile-sync-meta${state.isSyncing ? ' profile-sync-meta--busy' : ''}` },
        state.isSyncing ? 'در حال همگام‌سازی با سرور...' : lastSyncText),
    );
  } else {
    // ----------------------------------------------------
    // Unauthenticated: Sleek Login & Register Flow
    // ----------------------------------------------------
    let mode: 'login' | 'register' = 'login';

    const heroBanner = h(
      'div',
      { className: 'auth-hero-banner' },
      h('h4', { className: 'auth-hero-title' }, 'پیشرفتت را همه‌جا همراه داشته باش'),
      h(
        'p',
        { className: 'auth-hero-desc' },
        'با یک حساب رایگان، سؤال‌ها، امتیازها و کارت‌هایت روی همه دستگاه‌ها همگام می‌شوند.',
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
      'ورود',
    );
    const tabRegister = h(
      'button',
      {
        type: 'button',
        className: 'auth-tab',
        onClick: () => switchMode('register'),
      },
      'ساخت حساب',
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
    const nameIcon = h('span', { className: 'auth-input-icon' }, icon(ICON.user, 16));
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
    const emailIcon = h('span', { className: 'auth-input-icon' }, icon(ICON.mail, 16));
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
    const passIcon = h('span', { className: 'auth-input-icon' }, icon(ICON.lock, 16));
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
          const show = passInput.type === 'password';
          passInput.type = show ? 'text' : 'password';
          togglePassBtn.replaceChildren(icon(show ? ICON.eyeOff : ICON.eye, 16));
        },
      },
      icon(ICON.eye, 16),
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
      'ثبت‌نام رایگان است و نیازی به تأیید ایمیل ندارد.',
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

        toast(`خوش آمدید ${authSession.user.name}`, { kind: 'success' });

        // Trigger initial cloud sync
        void performFullSync().then((res) => {
          if (res.success) {
            if (res.autoDownloadedCount && res.autoDownloadedCount > 0) {
              toast(
                `پیشرفت شما همگام شد و ${faNum(res.autoDownloadedCount)} موضوع به‌طور خودکار دانلود شدند`,
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
    const summary = h('summary', { className: 'auth-advanced-summary' }, 'تنظیمات سرور (اختیاری)');
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

  return settingsSection('حساب کاربری', card);
}
