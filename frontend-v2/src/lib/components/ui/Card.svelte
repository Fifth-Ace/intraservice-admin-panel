<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    /** Стиль поверхности карточки */
    variant?: 'default' | 'outline' | 'filled' | 'flat';
    /** Внутренний отступ */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Семантический тег-обёртка */
    as?: 'section' | 'article' | 'div';
    class?: string;
    [key: string]: unknown;
  }

  let {
    children,
    variant = 'default',
    padding = 'md',
    as = 'section',
    class: klass = '',
    ...rest
  }: Props = $props();

  let cls = $derived(['card', `card--${variant}`, `card--pad-${padding}`, klass].filter(Boolean).join(' '));
</script>

<svelte:element this={as} {...rest} class={cls}>
  {@render children?.()}
</svelte:element>

<style>
  .card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }

  .card--outline {
    background: transparent;
    box-shadow: none;
  }

  .card--filled {
    background: var(--bg-surface-2);
    box-shadow: none;
  }

  .card--flat {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .card--pad-none {
    padding: 0;
  }

  .card--pad-sm {
    padding: var(--space-3);
  }

  .card--pad-md {
    padding: var(--space-5);
  }

  .card--pad-lg {
    padding: var(--space-6);
  }
</style>
