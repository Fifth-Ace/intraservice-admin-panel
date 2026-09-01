<script lang="ts">
  import { RefreshCw, Search } from '@lucide/svelte';
  import Card from '../ui/Card.svelte';
  import Badge from '../ui/Badge.svelte';
  import Button from '../ui/Button.svelte';
  import StatusDot from '../ui/StatusDot.svelte';
  import {
    filterTemplates,
    formatDefaultMinutes,
    formatUseCount,
    templateCategories,
    type TemplateItem,
  } from './settingsTemplatesUtils';

  interface Props {
    items: TemplateItem[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
  }

  let { items, loading, error, onRefresh }: Props = $props();

  const allCategories = $derived(templateCategories(items));
  let filterCategory = $state('');
  let searchQuery = $state('');

  const visible = $derived(
    filterTemplates(items, filterCategory, searchQuery),
  );
</script>

<section aria-label="Шаблоны заявок">
  <!-- Панель управления: поиск, фильтр по категории, обновление -->
  <div class="tmpl-toolbar">
    <label class="tmpl-search">
      <span class="tmpl-search__icon" aria-hidden="true">
        <Search size={15} />
      </span>
      <input
        bind:value={searchQuery}
        type="search"
        placeholder="Поиск по названию или решению…"
        aria-label="Поиск шаблонов"
      />
    </label>
    <span class="tmpl-toolbar__refresh">
      <Button size="sm" variant="outline" onclick={() => onRefresh()} disabled={loading}>
        <span class={loading ? 'is-spin' : ''} aria-hidden="true">
          <RefreshCw size={14} />
        </span>
        Обновить
      </Button>
    </span>
  </div>

  <!-- Фильтр-чипы по категориям -->
  <div class="tmpl-chips" role="group" aria-label="Фильтр по категориям">
    <button
      class:is-active={filterCategory === ''}
      class="chip"
      type="button"
      onclick={() => (filterCategory = '')}
    >
      Все
    </button>
    {#each allCategories as cat (cat)}
      <button
        class:is-active={filterCategory === cat}
        class="chip"
        type="button"
        onclick={() => (filterCategory = filterCategory === cat ? '' : cat)}
      >
        {cat}
      </button>
    {/each}
  </div>

  {#if error}
    <Card padding="md">
      <p class="tmpl-state tmpl-state--error" role="alert">Не удалось загрузить шаблоны: {error}</p>
    </Card>
  {:else if loading && visible.length === 0}
    <Card padding="md">
      <p class="tmpl-state">Загружаем шаблоны…</p>
    </Card>
  {:else if visible.length === 0}
    <Card padding="md">
      <p class="tmpl-state">Шаблоны по выбранным фильтрам не найдены</p>
    </Card>
  {:else}
    <div class="tmpl-grid">
      {#each visible as tpl (tpl.id)}
        <Card padding="md" as="article">
          <div class="tmpl-card">
            <div class="tmpl-card__head">
              <div class="tmpl-card__title">
                <strong>{tpl.name}</strong>
                <span class="tmpl-card__category">
                  <Badge size="sm" variant="neutral" dot>{tpl.category}</Badge>
                </span>
              </div>
              {#if tpl.active === false}
                <Badge size="sm" variant="danger">отключён</Badge>
              {/if}
            </div>

            {#if tpl.solution}
              <p class="tmpl-card__solution">{tpl.solution}</p>
            {/if}

            <div class="tmpl-card__meta">
              <span class="tmpl-meta-item" title="Плановая длительность">
                <span class="tmpl-meta-item__label">Время</span>
                <strong>{formatDefaultMinutes(tpl.default_minutes)}</strong>
              </span>
              <span class="tmpl-meta-item" title="Число применений">
                <span class="tmpl-meta-item__label">Применений</span>
                <strong>{formatUseCount(tpl.use_count)}</strong>
              </span>
              {#if tpl.active !== false}
                <span class="tmpl-meta-item tmpl-meta-item--status">
                  <StatusDot status="success" size="sm" label="активен" />
                  <span>активен</span>
                </span>
              {/if}
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</section>

<style>
  .tmpl-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }
  .tmpl-search {
    position: relative;
    flex: 1 1 240px;
    min-width: 0;
  }
  .tmpl-search__icon {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--fg-faint);
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .tmpl-search input {
    width: 100%;
    height: 34px;
    padding: 0 var(--space-3) 0 34px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-surface-2);
    color: var(--fg-primary);
    font-family: var(--font-sans);
    font-size: var(--text-md);
  }
  .tmpl-search input::placeholder {
    color: var(--fg-muted);
  }
  .tmpl-toolbar__refresh {
    flex: none;
  }
  .tmpl-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  .chip {
    height: 28px;
    padding: 0 var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    background: var(--bg-surface);
    color: var(--fg-secondary);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast) var(--ease-out),
      color var(--dur-fast) var(--ease-out);
  }
  .chip:hover {
    border-color: var(--border-strong);
    background: var(--bg-surface-2);
  }
  .chip.is-active {
    background: var(--accent-muted);
    border-color: var(--accent);
    color: var(--accent);
  }
  .tmpl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: var(--space-3);
    align-items: start;
  }
  .tmpl-card {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }
  .tmpl-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .tmpl-card__title {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }
  .tmpl-card__title strong {
    font-size: var(--text-sm);
    color: var(--fg-primary);
    overflow-wrap: anywhere;
  }
  .tmpl-card__category {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
  }
  .tmpl-card__solution {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--fg-muted);
    line-height: var(--leading-normal);
    overflow-wrap: anywhere;
  }
  .tmpl-card__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
  }
  .tmpl-meta-item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }
  .tmpl-meta-item__label {
    font-size: var(--text-xs);
    color: var(--fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .tmpl-meta-item strong {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--fg-primary);
    white-space: nowrap;
  }
  .tmpl-meta-item--status {
    margin-left: auto;
    color: var(--fg-secondary);
    font-size: var(--text-xs);
  }
  .tmpl-state {
    margin: 0;
    padding: var(--space-2);
    text-align: center;
    color: var(--fg-muted);
  }
  .tmpl-state--error {
    color: var(--danger);
  }
  .is-spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 560px) {
    .tmpl-toolbar {
      display: grid;
      grid-template-columns: 1fr;
      align-items: stretch;
    }
    .tmpl-toolbar__refresh {
      display: flex;
    }
    .tmpl-toolbar__refresh :global(.btn) {
      width: 100%;
    }
    .tmpl-chips {
      overflow-x: auto;
      flex-wrap: nowrap;
      padding-bottom: var(--space-1);
      margin-right: calc(var(--space-3) * -1);
      padding-right: var(--space-3);
      -webkit-overflow-scrolling: touch;
    }
    .chip {
      flex: none;
    }
  }
</style>
