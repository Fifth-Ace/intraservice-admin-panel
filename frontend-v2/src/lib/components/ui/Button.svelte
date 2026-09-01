<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    /** Если задан — рендерится <a> в стиле кнопки */
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    class?: string;
    [key: string]: unknown;
  }

  let {
    children,
    variant = 'primary',
    size = 'md',
    href = '',
    type = 'button',
    disabled = false,
    class: klass = '',
    ...rest
  }: Props = $props();

  let cls = $derived(['btn', `btn--${variant}`, `btn--${size}`, disabled ? 'is-disabled' : '', klass]
    .filter(Boolean)
    .join(' '));
</script>

{#if href}
  <a {...rest} {href} class={cls} aria-disabled={disabled || undefined}>
    {@render children?.()}
  </a>
{:else}
  <button {...rest} {type} class={cls} disabled={disabled || undefined}>
    {@render children?.()}
  </button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    text-decoration: none;
    transition:
      background-color var(--dur-fast) var(--ease-out),
      border-color var(--dur-fast) var(--ease-out),
      box-shadow var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out);
  }

  .btn:hover {
    text-decoration: none;
  }

  .btn:active {
    transform: translateY(1px);
  }

  .btn--sm {
    height: 30px;
    padding: 0 var(--space-3);
    font-size: var(--text-sm);
  }

  .btn--md {
    height: 34px;
    padding: 0 var(--space-4);
    font-size: var(--text-md);
  }

  .btn--lg {
    height: 42px;
    padding: 0 var(--space-5);
    font-size: var(--text-lg);
  }

  .btn--primary {
    background: var(--accent);
    color: var(--accent-fg);
    box-shadow: var(--shadow-sm);
  }

  .btn--primary:hover {
    background: var(--accent-hover);
  }

  .btn--secondary {
    background: var(--bg-surface-2);
    color: var(--fg-primary);
    border-color: var(--border);
  }

  .btn--secondary:hover {
    background: var(--bg-elevated);
    border-color: var(--border-strong);
  }

  .btn--outline {
    background: transparent;
    color: var(--fg-primary);
    border-color: var(--border-strong);
  }

  .btn--outline:hover {
    background: var(--accent-muted);
    border-color: var(--accent);
    color: var(--accent);
  }

  .btn--ghost {
    background: transparent;
    color: var(--fg-secondary);
  }

  .btn--ghost:hover {
    background: var(--bg-surface-2);
    color: var(--fg-primary);
  }

  .btn--danger {
    background: var(--danger);
    color: var(--fg-inverse);
  }

  .btn--danger:hover {
    background: color-mix(in srgb, var(--danger) 88%, #000);
  }

  .btn:disabled,
  .btn.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
</style>
