import { describe, expect, it } from 'vitest';
import {
  AI_CHAIN,
  formatAvgApiMs,
  formatUptime,
  hasSamples,
  logBadgeVariant,
  logDotStatus,
  logResults,
  logSources,
  logTime,
  serviceTone,
  sortLogItems,
  type LogItem,
} from './utils';

const item = (patch: Partial<LogItem>): LogItem => ({
  action: 'create',
  source: 'telegram',
  result: 'ok',
  created_at: new Date(1_600_000_000_000).toISOString(),
  ...patch,
});

describe('AI_CHAIN', () => {
  it('is Luna → Gemini 3.5 → Gemini 3.1 → DeepSeek', () => {
    expect(AI_CHAIN.map((n) => n.name)).toEqual([
      'Luna',
      'Gemini 3.5',
      'Gemini 3.1',
      'DeepSeek',
    ]);
  });
});

describe('formatUptime', () => {
  it('formats hours and minutes', () => {
    expect(formatUptime(86_400 + 1320)).toBe('24 ч 22 м');
  });
  it('shows minutes below an hour', () => {
    expect(formatUptime(7 * 60)).toBe('7 м');
  });
  it('returns dash for non-positive', () => {
    expect(formatUptime(0)).toBe('—');
    expect(formatUptime(NaN)).toBe('—');
  });
});

describe('formatAvgApiMs', () => {
  it('formats ms', () => {
    expect(formatAvgApiMs(166.4)).toBe('166 мс');
  });
  it('returns dash for missing values', () => {
    expect(formatAvgApiMs(null)).toBe('—');
    expect(formatAvgApiMs(undefined)).toBe('—');
    expect(formatAvgApiMs(0)).toBe('—');
    expect(formatAvgApiMs(NaN)).toBe('—');
  });
});

describe('hasSamples', () => {
  it('is true only for positive finite numbers', () => {
    expect(hasSamples(4)).toBe(true);
    expect(hasSamples(0)).toBe(false);
    expect(hasSamples(null)).toBe(false);
    expect(hasSamples(undefined)).toBe(false);
    expect(hasSamples(NaN)).toBe(false);
  });
});

describe('serviceTone', () => {
  it('maps statuses to dot and badge tones', () => {
    expect(serviceTone('ok')).toEqual({ dot: 'success', badge: 'success' });
    expect(serviceTone('warn')).toEqual({ dot: 'warning', badge: 'warning' });
    expect(serviceTone('backup')).toEqual({ dot: 'info', badge: 'info' });
    expect(serviceTone('idle')).toEqual({ dot: 'idle', badge: 'neutral' });
  });
});

describe('sortLogItems', () => {
  it('sorts newest first', () => {
    const sorted = sortLogItems([
      item({ created_at: '2026-01-01T10:00:00Z' }),
      item({ created_at: '2026-01-01T12:00:00Z' }),
      item({ created_at: '2026-01-01T11:00:00Z' }),
    ]);
    expect(sorted.map((r) => r.created_at)).toEqual([
      '2026-01-01T12:00:00Z',
      '2026-01-01T11:00:00Z',
      '2026-01-01T10:00:00Z',
    ]);
  });
  it('does not mutate input', () => {
    const input = [item({ created_at: '2026-01-01T10:00:00Z' })];
    sortLogItems(input);
    expect(input[0].created_at).toBe('2026-01-01T10:00:00Z');
  });
});

describe('logSources / logResults', () => {
  it('returns unique sources and results preserving order', () => {
    const rows = [
      item({ source: 'a', result: 'ok' }),
      item({ source: 'b', result: 'error' }),
      item({ source: 'a', result: 'ok' }),
    ];
    expect(logSources(rows)).toEqual(['a', 'b']);
    expect(logResults(rows)).toEqual(['ok', 'error']);
  });
});

describe('logTime', () => {
  it('prefers precomputed time', () => {
    expect(logTime(item({ time: '2 мин назад' }))).toBe('2 мин назад');
  });
  it('formats created_at locally when time missing', () => {
    const t = logTime(item({ time: undefined }));
    expect(typeof t).toBe('string');
    expect(t.length).toBeGreaterThan(0);
  });
  it('returns raw string for invalid dates', () => {
    expect(logTime(item({ created_at: 'garbage' }))).toBe('garbage');
  });
  it('returns dash when empty', () => {
    expect(logTime(item({ created_at: '', time: undefined }))).toBe('—');
  });
});

describe('logBadgeVariant / logDotStatus', () => {
  it('maps known keywords to tones', () => {
    expect(logBadgeVariant('ok')).toBe('success');
    expect(logBadgeVariant('успех')).toBe('success');
    expect(logBadgeVariant('warn')).toBe('warning');
    expect(logBadgeVariant('error')).toBe('danger');
    expect(logBadgeVariant('ошибка')).toBe('danger');
    expect(logBadgeVariant('unknown')).toBe('neutral');
  });
  it('dot status follows badge but neutral becomes idle', () => {
    expect(logDotStatus('ok')).toBe('success');
    expect(logDotStatus('warn')).toBe('warning');
    expect(logDotStatus('error')).toBe('danger');
    expect(logDotStatus('whatever')).toBe('idle');
  });
});
