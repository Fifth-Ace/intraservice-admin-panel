import type { ServiceStatus } from '../../types';

/** Чистые helper'ы для страниц Системы и Журнала. Без UI и без состояния. */

export const AI_CHAIN: ReadonlyArray<{ name: string; tag: string }> = [
  { name: 'Luna', tag: 'координатор' },
  { name: 'Gemini 3.5', tag: 'классификация' },
  { name: 'Gemini 3.1', tag: 'извлечение полей' },
  { name: 'DeepSeek', tag: 'резюме' },
];

export type LogResultKind = 'ok' | 'warn' | 'error';

/** Безопасное позиционное имя статуса сервиса + заметка для подписи. */
export function serviceTone(status: ServiceStatus): { dot: 'success' | 'warning' | 'info' | 'idle'; badge: 'success' | 'warning' | 'neutral' | 'info' } {
  switch (status) {
    case 'ok':
      return { dot: 'success', badge: 'success' };
    case 'warn':
      return { dot: 'warning', badge: 'warning' };
    case 'backup':
      return { dot: 'info', badge: 'info' };
    default:
      return { dot: 'idle', badge: 'neutral' };
  }
}

/** "86400.5" → "24 ч 0 м"; меньше часа — только минуты; 0 → "—". */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} ч ${m} м` : `${m} м`;
}

/** Средний API-latency: null/NaN/0 → "—", иначе "166 мс". */
export function formatAvgApiMs(avgApiMs: number | null | undefined): string {
  if (avgApiMs == null || !Number.isFinite(avgApiMs) || avgApiMs <= 0) return '—';
  return `${Math.round(avgApiMs)} мс`;
}

/** Скрывать ли колонку/значение "N замеров" (нет данных). */
export function hasSamples(samples: number | null | undefined): boolean {
  return typeof samples === 'number' && Number.isFinite(samples) && samples > 0;
}

export interface LogItem {
  id?: string | number;
  action: string;
  source: string;
  result: string;
  created_at: string;
  title?: string;
  sub?: string;
  time?: string;
}

/** Скольинг логов: всегда первые — самые свежие. */
export function sortLogItems<T extends { created_at: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/** Уникальные источники в порядке появления. */
export function logSources(items: readonly LogItem[]): string[] {
  return [...new Set(items.map((i) => i.source).filter(Boolean))];
}

/** Уникальные результаты в порядке появления. */
export function logResults(items: readonly LogItem[]): string[] {
  return [...new Set(items.map((i) => i.result).filter(Boolean))];
}

/** Человекочитаемое время: либо готовый time, либо локально из created_at. */
export function logTime(item: LogItem): string {
  if (item.time) return item.time;
  if (!item.created_at) return '—';
  const d = new Date(item.created_at);
  return Number.isNaN(d.getTime()) ? item.created_at : d.toLocaleString();
}

/** Результат → цветовой тон (безопасный маппинг). */
export function logBadgeVariant(result: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const r = result.toLowerCase();
  if (r.includes('ok') || r.includes('success') || r.includes('успех')) return 'success';
  if (r.includes('warn') || r.includes('предупрежд')) return 'warning';
  if (r.includes('err') || r.includes('fail') || r.includes('ошибк')) return 'danger';
  return 'neutral';
}

/** Результат → тон точки StatusDot. */
export function logDotStatus(result: string): 'success' | 'warning' | 'danger' | 'idle' {
  const b = logBadgeVariant(result);
  return b === 'neutral' ? 'idle' : b;
}
