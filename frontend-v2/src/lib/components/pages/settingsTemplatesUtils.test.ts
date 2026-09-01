import { describe, expect, it } from 'vitest';
import {
  allSecretFlagsKnown,
  configBool,
  configString,
  filterTemplates,
  formatDefaultMinutes,
  formatUseCount,
  secretLabel,
  secretSet,
  templateCategories,
  type TemplateItem,
} from './settingsTemplatesUtils';

const tpl = (patch: Partial<TemplateItem>): TemplateItem => ({
  id: 1,
  name: 'Default',
  category: 'ПАРМ',
  ...patch,
});

describe('templateCategories', () => {
  it('returns unique non-empty categories in order', () => {
    expect(
      templateCategories([
        tpl({ category: 'ПАРМ' }),
        tpl({ category: 'ПКМТ' }),
        tpl({ category: 'ПАРМ' }),
      ]),
    ).toEqual(['ПАРМ', 'ПКМТ']);
  });
  it('drops empty categories', () => {
    expect(templateCategories([tpl({ category: '' }), tpl({ category: ' ' })])).toEqual([]);
  });
});

describe('filterTemplates', () => {
  const rows = [
    tpl({ id: 1, name: 'Не печатает МФУ', category: 'ПАРМ', solution: 'Заменить тонер' }),
    tpl({ id: 2, name: 'Скачок напряжения', category: 'ПКМТ', solution: 'Проверить ИБП' }),
  ];
  it('returns all when no category and no query', () => {
    expect(filterTemplates(rows, '', '')).toHaveLength(2);
  });
  it('filters by category', () => {
    const out = filterTemplates(rows, 'ПАРМ', '');
    expect(out.map((r) => r.id)).toEqual([1]);
  });
  it('filters by search query across name and solution', () => {
    expect(filterTemplates(rows, '', 'мфу')).toEqual([rows[0]]);
    expect(filterTemplates(rows, '', 'ибп')).toEqual([rows[1]]);
    expect(filterTemplates(rows, '', '2')).toEqual([rows[1]]);
  });
  it('combines category and query', () => {
    expect(filterTemplates(rows, 'ПКМТ', 'ибп')).toEqual([rows[1]]);
    expect(filterTemplates(rows, 'ПАРМ', 'ибп')).toEqual([]);
  });
  it('is case-insensitive', () => {
    expect(filterTemplates(rows, '', 'МФУ')).toEqual([rows[0]]);
  });
});

describe('formatDefaultMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatDefaultMinutes(90)).toBe('1 ч 30 мин');
  });
  it('formats only hours', () => {
    expect(formatDefaultMinutes(120)).toBe('2 ч');
  });
  it('formats only minutes', () => {
    expect(formatDefaultMinutes(45)).toBe('45 мин');
  });
  it('returns dash for invalid values', () => {
    expect(formatDefaultMinutes(0)).toBe('—');
    expect(formatDefaultMinutes(null)).toBe('—');
    expect(formatDefaultMinutes(undefined)).toBe('—');
    expect(formatDefaultMinutes(-5)).toBe('—');
  });
});

describe('formatUseCount', () => {
  it('formats positive counts', () => {
    expect(formatUseCount(12)).toBe('12');
  });
  it('returns zero for missing or non-positive', () => {
    expect(formatUseCount(undefined)).toBe('0');
    expect(formatUseCount(0)).toBe('0');
  });
});

describe('configString / configBool', () => {
  it('reads string fields safely', () => {
    expect(configString({ bot_name: 'Luna' }, 'bot_name')).toBe('Luna');
    expect(configString({ bot_name: 42 }, 'bot_name')).toBe('');
    expect(configString(undefined, 'bot_name')).toBe('');
    expect(configString({}, 'missing')).toBe('');
  });
  it('reads bool fields with fallback', () => {
    expect(configBool({ notifications_enabled: true }, 'notifications_enabled')).toBe(true);
    expect(configBool({ notifications_enabled: 'yes' }, 'notifications_enabled')).toBe(false);
    expect(configBool({}, 'x', true)).toBe(true);
    expect(configBool(undefined, 'x', true)).toBe(true);
    expect(configBool({}, 'x')).toBe(false);
  });
});

describe('secret helpers', () => {
  const ok = {
    intraservice_password: true,
    scheduler_token: false,
    intake_token: true,
  };
  it('allSecretFlagsKnown accepts full boolean set', () => {
    expect(allSecretFlagsKnown(ok)).toBe(true);
  });
  it('allSecretFlagsKnown rejects partial / non-boolean', () => {
    expect(allSecretFlagsKnown({ ...ok, scheduler_token: 'yes' })).toBe(false);
    expect(allSecretFlagsKnown({ intraservice_password: true })).toBe(false);
    expect(allSecretFlagsKnown(undefined as never)).toBe(false);
  });
  it('secretSet returns boolean flag', () => {
    expect(secretSet(ok, 'intake_token')).toBe(true);
    expect(secretSet(ok, 'scheduler_token')).toBe(false);
    expect(secretSet(undefined, 'x')).toBe(false);
    expect(secretSet({ x: 1 }, 'x')).toBe(false);
  });
  it('secretLabel maps set state', () => {
    expect(secretLabel(true)).toBe('задан');
    expect(secretLabel(false)).toBe('не задан');
  });
});
