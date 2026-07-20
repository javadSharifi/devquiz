import { store } from '../state.js';
import { getMergedTopic } from '../lib/topic-utils.js';
import { fieldRow } from '../lib/helpers.js';
import type { CustomQuestion } from '../types.js';
import type { AppState } from '../state.js';
import { addCustomQuestion } from '../storage.js';
import { button, h, toast } from '../ui.js';

const NEW_CATEGORY = '__new__';

export function renderAdd(state: AppState): HTMLElement {
  const wrap = h('div', { className: 'view view--add' });
  wrap.appendChild(h('h2', { className: 'view__title' }, 'سؤال جدید'));

  const topicIds = Object.keys(state.topics);
  const topicSelect = h('select', { className: 'field__input', id: 'add-topic' });
  for (const id of topicIds) {
    const t = state.topics[id];
    topicSelect.appendChild(h('option', { value: id }, t?.meta.title || id));
  }
  if (state.topics[state.activeTopicId]) topicSelect.value = state.activeTopicId;

  const categorySelect = h('select', { className: 'field__input', id: 'add-category' });
  const newCatInput = h('input', {
    className: 'field__input',
    type: 'text',
    id: 'add-newcat',
    placeholder: 'نام دسته جدید…',
  });
  const newCatField = fieldRow('نام دسته جدید', newCatInput, 'add-newcat');
  newCatField.hidden = true;

  const fillCategories = (): void => {
    categorySelect.replaceChildren();
    const merged = getMergedTopic(topicSelect.value);
    for (const c of merged?.categories ?? []) {
      categorySelect.appendChild(h('option', { value: c.id }, `${c.icon} ${c.title}`));
    }
    categorySelect.appendChild(h('option', { value: NEW_CATEGORY }, '➕ دسته جدید…'));
    newCatField.hidden = categorySelect.value !== NEW_CATEGORY;
  };
  fillCategories();
  topicSelect.addEventListener('change', () => {
    fillCategories();
    validate();
  });
  categorySelect.addEventListener('change', () => {
    const isNew = categorySelect.value === NEW_CATEGORY;
    newCatField.hidden = !isNew;
    validate();
  });

  const questionInput = h('textarea', {
    className: 'field__input field__input--area',
    id: 'add-question',
    placeholder: 'متن سؤال (مارک‌داون پشتیبانی می‌شود)…',
  });
  const answerInput = h('textarea', {
    className: 'field__input field__input--area field__input--tall',
    id: 'add-answer',
    placeholder: 'پاسخ (مارک‌داون و بلاک کد پشتیبانی می‌شود)…',
  });

  const qError = h('p', { className: 'field__err' });
  const aError = h('p', { className: 'field__err' });
  const cError = h('p', { className: 'field__err' });

  const submit = button('ذخیره سؤال', () => void save(), { variant: 'primary', className: 'btn--wide' });
  submit.disabled = true;

  function validate(): boolean {
    const qOk = questionInput.value.trim().length >= 5;
    const aOk = answerInput.value.trim().length >= 3;
    const needNewCat = categorySelect.value === NEW_CATEGORY;
    const cOk = !needNewCat || newCatInput.value.trim().length >= 2;
    qError.textContent = questionInput.value.length > 0 && !qOk ? 'سؤال باید حداقل ۵ کاراکتر باشد.' : '';
    aError.textContent = answerInput.value.length > 0 && !aOk ? 'پاسخ باید حداقل ۳ کاراکتر باشد.' : '';
    cError.textContent = needNewCat && newCatInput.value.length > 0 && !cOk ? 'نام دسته باید حداقل ۲ کاراکتر باشد.' : '';
    const valid = qOk && aOk && cOk && topicSelect.value.length > 0;
    submit.disabled = !valid;
    return valid;
  }
  for (const el of [questionInput, answerInput, newCatInput]) {
    el.addEventListener('input', validate);
  }

  async function save(): Promise<void> {
    if (!validate()) return;
    const topicId = topicSelect.value;
    const isNewCat = categorySelect.value === NEW_CATEGORY;
    const categoryId = isNewCat
        ? `custom-cat-${crypto.randomUUID()}`
      : categorySelect.value;
    const q: CustomQuestion = {
      id: `custom_${crypto.randomUUID()}`,
      question: questionInput.value.trim(),
      answer: answerInput.value.trim(),
      topicId,
      categoryId,
      isCustom: true,
      ...(isNewCat ? { categoryTitle: newCatInput.value.trim(), categoryLevel: 'junior' } : {}),
    };
    try {
      await addCustomQuestion(q);
      store.dispatch({ type: 'ADD_CUSTOM_QUESTION', question: q });
      questionInput.value = '';
      answerInput.value = '';
      newCatInput.value = '';
      validate();
      fillCategories();
      toast('سؤال ذخیره شد ✅', { kind: 'success' });
      store.dispatch({ type: 'DATA_CHANGED' });
    } catch {
      toast('ذخیره‌سازی ناموفق بود. دوباره تلاش کن.', { kind: 'error' });
    }
  }

  wrap.append(
    fieldRow('موضوع', topicSelect, 'add-topic'),
    fieldRow('دسته‌بندی', categorySelect, 'add-category'),
    newCatField,
    cError,
    fieldRow('سؤال', questionInput, 'add-question'),
    qError,
    fieldRow('پاسخ', answerInput, 'add-answer'),
    aError,
    submit,
    h('p', { className: 'muted-note' }, 'سوال‌های خودت هیچ‌وقت با بروزرسانی موضوع‌ها پاک نمی‌شن.'),
  );
  return wrap;
}
