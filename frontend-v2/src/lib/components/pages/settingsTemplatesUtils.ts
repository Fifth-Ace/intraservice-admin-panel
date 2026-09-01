/**
 * Чистые helper'ы для страниц Шаблонов и Настроек. Без UI, без состояния.
 */

/* ================= Шаблоны ================= */

export interface TemplateItem {
  id: string | number;
  name: string;
  category: string;
  solution?: string;
  default_minutes?: number | null;
  use_count?: number;
  active?: boolean;
}

/** Нормализованный список категорий без пустых строк, в порядке появления. */
export function templateCategories(items: readonly TemplateItem[]): string[] {
  return [...new Set(items.map((i) => i.category).filter((c) => typeof c === 'string' && c.trim().length > 0))];
}

/** Фильтр шаблонов по выбранной категории ('' = все) и поисковой строке. */
export function filterTemplates(
  items: readonly TemplateItem[],
  category: string,
  query: string,
): TemplateItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((i) => {
    if (category && i.category !== category) return false;
    if (!q) return true;
    const hay = [i.name, i.solution, String(i.id)].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

/** Человекочитаемое значение плановой длительности шаблона; пустое/невалидное → '—'. */
export function formatDefaultMinutes(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—';
  const h = Math.floor(value / 60);
  const m = value % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}

/** Счётчик применений: безопасный вывод, 0/undefined → '0'. */
export function formatUseCount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? String(value) : '0';
}

/* ================= Настройки ================= */

/** Безопасное чтение скалярного поля из дефолтного объекта конфигурации. */
export function configString(config: Record<string, unknown> | undefined, key: string): string {
  if (!config) return '';
  const v = config[key];
  return typeof v === 'string' ? v : '';
}

/** Истинный bool из конфигурации: true → true, всё остальное (вкл. undefined) → false. */
export function configBool(config: Record<string, unknown> | undefined, key: string, fallback = false): boolean {
  if (!config) return fallback;
  const v = config[key];
  return typeof v === 'boolean' ? v : fallback;
}

export interface SecretStatus {
  intraservice_password: boolean;
  scheduler_token: boolean;
  intake_token: boolean;
}

/** True, если у переданного настроечного объекта все три поля имеют тип boolean. */
export function allSecretFlagsKnown(
  secrets: Record<string, unknown> | SecretStatus,
): secrets is SecretStatus {
  if (!secrets || typeof secrets !== 'object') return false;
  return (
    typeof (secrets as SecretStatus).intraservice_password === 'boolean' &&
    typeof (secrets as SecretStatus).scheduler_token === 'boolean' &&
    typeof (secrets as SecretStatus).intake_token === 'boolean'
  );
}

/** Безопасный флаг «секрет задан» для имени поля; по умолчанию false. */
export function secretSet(secrets: Record<string, unknown> | SecretStatus | undefined, key: string): boolean {
  if (!secrets || typeof secrets !== 'object') return false;
  const v = (secrets as Record<string, unknown>)[key];
  return typeof v === 'boolean' ? v : false;
}

/** Лейбл статуса секрета: задан / не задан. */
export function secretLabel(set: boolean): string {
  return set ? 'задан' : 'не задан';
}
