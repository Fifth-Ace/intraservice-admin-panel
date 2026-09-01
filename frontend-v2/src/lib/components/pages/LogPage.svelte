<script lang="ts">
  import { RefreshCw } from '@lucide/svelte';
  import Card from '../ui/Card.svelte';
  import Badge from '../ui/Badge.svelte';
  import Button from '../ui/Button.svelte';
  import StatusDot from '../ui/StatusDot.svelte';
  import {
    logBadgeVariant,
    logDotStatus,
    logResults,
    logSources,
    logTime,
    sortLogItems,
    type LogItem,
  } from './utils';

  interface Props {
    items: LogItem[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
  }

  let { items, loading, error, onRefresh }: Props = $props();

  const allSources = $derived(logSources(items));
  const allResults = $derived(logResults(items));
  let filterSource = $state('');
  let filterResult = $state('all');

  const visible = $derived.by(() => {
    const rows = sortLogItems(items);
    if (!filterSource && filterResult === 'all') return rows;
    return rows.filter(
      (r) =>
        (!filterSource || r.source === filterSource) &&
        (filterResult === 'all' || r.result === filterResult),
    );
  });
</script>

<section aria-label="Журнал событий">
  <!-- Панель фильтров -->
  <div class="log-filters">
    <label class="log-filter">
      <span class="log-filter__label">Источник</span>
      <select bind:value={filterSource} aria-label="Фильтр по источнику">
        <option value="">Все источники</option>
        {#each allSources as src (src)}
          <option value={src}>{src}</option>
        {/each}
      </select>
    </label>
    <label class="log-filter">
      <span class="log-filter__label">Результат</span>
      <select bind:value={filterResult} aria-label="Фильтр по результату">
        <option value="all">Все результаты</option>
        {#each allResults as res (res)}
          <option value={res}>{res}</option>
        {/each}
      </select>
    </label>
    <span class="log-filter__refresh">
      <Button size="sm" variant="outline" onclick={() => onRefresh()} disabled={loading}>
        <span class={loading ? 'is-spin' : ''} aria-hidden="true">
          <RefreshCw size={14} />
        </span>
        Обновить
      </Button>
    </span>
  </div>

  {#if error}
    <Card padding="md">
      <p class="log-error" role="alert">Не удалось загрузить журнал: {error}</p>
    </Card>
  {:else if loading && visible.length === 0}
    <Card padding="md">
      <p class="log-empty">Загружаем журнал…</p>
    </Card>
  {:else if visible.length === 0}
    <Card padding="md">
      <p class="log-empty">Записей по выбранным фильтрам нет</p>
    </Card>
  {:else}
    <!-- Desktop: таблица -->
    <div class="log-table-wrap" role="region" aria-label="Таблица событий журнала">
      <table class="log-table">
        <thead>
          <tr>
            <th scope="col">Время</th>
            <th scope="col">Действие</th>
            <th scope="col">Источник</th>
            <th scope="col">Результат</th>
            <th scope="col">Описание</th>
          </tr>
        </thead>
        <tbody>
          {#each visible as row (row.id ?? `${row.created_at}-${row.action}`)}
            <tr>
              <td>
                <time datetime={row.created_at}>{logTime(row)}</time>
              </td>
              <td><strong>{row.action}</strong></td>
              <td><Badge size="sm" variant="neutral">{row.source}</Badge></td>
              <td>
                <span class="log-badge-row">
                  <StatusDot status={logDotStatus(row.result)} size="sm" label={row.result} />
                  <Badge size="sm" variant={logBadgeVariant(row.result)}>{row.result}</Badge>
                </span>
              </td>
              <td class="log-table__desc">
                {#if row.title}
                  <strong>{row.title}</strong>
                {/if}
                {#if row.sub}
                  <span>{row.sub}</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile: карточки -->
    <ul class="log-mobile">
      {#each visible as row (row.id ?? `${row.created_at}-${row.action}`)}
        <li>
          <Card padding="sm">
            <div class="log-mobile__card">
              <div class="log-mobile__head">
                <strong>{row.action}</strong>
                <Badge size="sm" variant={logBadgeVariant(row.result)}>{row.result}</Badge>
              </div>
              <div class="log-mobile__meta">
                <Badge size="sm" variant="neutral">{row.source}</Badge>
                <time datetime={row.created_at}>{logTime(row)}</time>
              </div>
              {#if row.title || row.sub}
                <p class="log-mobile__desc">
                  {#if row.title}{row.title}{/if}
                  {#if row.sub && row.title} · {/if}
                  {#if row.sub}{row.sub}{/if}
                </p>
              {/if}
            </div>
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .log-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .log-filter {
    display: grid;
    gap: var(--space-1);
    flex: 1 1 180px;
    min-width: 0;
  }
  .log-filter__label {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fg-muted);
  }
  .log-filter select {
    height: 34px;
    padding: 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-surface-2);
    color: var(--fg-primary);
  }
  .log-filter__refresh {
    flex: 1 1 auto;
    display: flex;
    justify-content: flex-end;
  }
  .log-empty,
  .log-error {
    margin: 0;
    padding: var(--space-4);
    text-align: center;
    color: var(--fg-muted);
  }
  .log-error {
    color: var(--danger);
  }
  .log-table-wrap {
    overflow-x: auto;
  }
  .log-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }
  .log-table th {
    text-align: left;
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fg-muted);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .log-table td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
    vertical-align: top;
    color: var(--fg-primary);
  }
  .log-table tbody tr:last-child td {
    border-bottom: 0;
  }
  .log-table tbody tr:nth-child(even) {
    background: var(--bg-surface-2);
  }
  .log-table time {
    white-space: nowrap;
    color: var(--fg-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
  .log-table__desc {
    min-width: 220px;
  }
  .log-table__desc strong {
    display: block;
  }
  .log-table__desc span {
    display: block;
    color: var(--fg-muted);
    font-size: var(--text-sm);
  }
  .log-badge-row {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }
  .log-mobile {
    display: none;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: var(--space-3);
  }
  .log-mobile__card {
    display: grid;
    gap: var(--space-2);
  }
  .log-mobile__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .log-mobile__head strong {
    font-size: var(--text-sm);
  }
  .log-mobile__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
  .log-mobile__meta time {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--fg-muted);
  }
  .log-mobile__desc {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--fg-muted);
    overflow-wrap: anywhere;
  }
  .is-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 860px) {
    .log-table-wrap {
      display: none;
    }
    .log-mobile {
      display: grid;
    }
  }
  @media (max-width: 560px) {
    .log-filters {
      display: grid;
      grid-template-columns: 1fr;
      align-items: stretch;
    }
    .log-filter__refresh {
      justify-self: stretch;
      justify-content: stretch;
      margin-top: var(--space-1);
    }
    .log-filter__refresh :global(.btn) {
      width: 100%;
    }
    .log-mobile {
      gap: var(--space-3);
    }
  }
</style>
