<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    variant?: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    size?: 'sm' | 'md';
    /** Показывать точку-индикатор слева от текста */
    dot?: boolean;
    class?: string;
    [key: string]: unknown;
  }

  let {
    children,
    variant = 'accent',
    size = 'md',
    dot = false,
    class: klass = '',
    ...rest
  }: Props = $props();

  let cls = $derived(['badge', `badge--${variant}`, `badge--${size}`, klass].filter(Boolean).join(' '));
</script>

<span {...rest} class={cls}>
  {#if dot}
    <span class="badge__dot" aria-hidden="true"></span>
  {/if}
  {@render children?.()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: var(--radius-full);
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
    vertical-align: middle;
  }

  .badge--sm {
    height: 20px;
    padding: 0 8px;
    font-size: var(--text-xs);
  }

  .badge--md {
    height: 24px;
    padding: 0 10px;
    font-size: var(--text-sm);
  }

  .badge__dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: currentColor;
    opacity: 0.85;
  }

  .badge--accent {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .badge--success {
    background: var(--success-muted);
    color: var(--success);
  }

  .badge--warning {
    background: var(--warning-muted);
    color: var(--warning);
  }

  .badge--danger {
    background: var(--danger-muted);
    color: var(--danger);
  }

  .badge--info {
    background: var(--info-muted);
    color: var(--info);
  }

  .badge--neutral {
    background: var(--neutral-muted);
    color: var(--fg-secondary);
  }
</style>
