<script lang="ts">
  export interface StatItem {
    label: string;
    value: string | number;
    /** Текст изменения, например «+2» */
    delta?: string;
    trend?: 'up' | 'down' | 'flat';
    tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
    /** Подсказка для title/подписи */
    hint?: string;
  }

  interface Props {
    items: StatItem[];
    /** Число колонок на desktop (на мобильном всегда 2) */
    columns?: 2 | 3 | 4 | 5;
    class?: string;
    [key: string]: unknown;
  }

  let { items, columns = 4, class: klass = '', ...rest }: Props = $props();

  const trendArrow = (t?: 'up' | 'down' | 'flat') =>
    t === 'up' ? '↑' : t === 'down' ? '↓' : '–';

  const trendWord = (t?: 'up' | 'down' | 'flat') =>
    t === 'up' ? 'рост' : t === 'down' ? 'снижение' : 'без изменений';
</script>

<dl {...rest} class="stat-strip stat-strip--c{columns} {klass}">
  {#each items as item (item.label)}
    <div class="stat" title={item.hint}>
      <dt class="stat__label">{item.label}</dt>
      <dd class="stat__value {item.tone && item.tone !== 'default' ? `stat__value--${item.tone}` : ''}">
        {item.value}
      </dd>
      {#if item.delta}
        <dd
          class="stat__delta stat__delta--{item.trend ?? 'flat'}"
          aria-label={`${item.label}: ${trendWord(item.trend)} ${item.delta}`}
        >
          <span aria-hidden="true">{trendArrow(item.trend)}</span>
          {item.delta}
        </dd>
      {/if}
    </div>
  {/each}
</dl>

<style>
  .stat-strip {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 720px) {
    .stat-strip--c3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .stat-strip--c4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .stat-strip--c5 {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }

  .stat {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
  }

  .stat__label {
    margin-bottom: var(--space-2);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  .stat__value {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xl);
    font-weight: 600;
    line-height: var(--leading-tight);
    color: var(--fg-primary);
  }

  .stat__value--accent {
    color: var(--accent);
  }

  .stat__value--success {
    color: var(--success);
  }

  .stat__value--warning {
    color: var(--warning);
  }

  .stat__value--danger {
    color: var(--danger);
  }

  .stat__delta {
    margin: var(--space-1) 0 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .stat__delta--up {
    color: var(--success);
  }

  .stat__delta--down {
    color: var(--danger);
  }

  .stat__delta--flat {
    color: var(--fg-muted);
  }
</style>
