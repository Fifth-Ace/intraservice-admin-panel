<script lang="ts">
  import type { Component, Snippet } from 'svelte';

  interface Crumb {
    label: string;
    href?: string;
  }

  interface Props {
    title: string;
    description?: string;
    /** Lucide-иконка слева от заголовка */
    icon?: Component;
    /** Контент справа (кнопки действий) */
    actions?: Snippet;
    breadcrumbs?: Crumb[];
    class?: string;
    [key: string]: unknown;
  }

  let {
    title,
    description = '',
    icon,
    actions,
    breadcrumbs = [],
    class: klass = '',
    ...rest
  }: Props = $props();
</script>

<header {...rest} class="page-header {klass}">
  <div class="page-header__main">
    {#if icon}
      {@const Icon = icon}
      <span class="page-header__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
    {/if}
    <div class="page-header__text">
      {#if breadcrumbs.length}
        <nav class="page-header__crumbs" aria-label="Хлебные крошки">
          {#each breadcrumbs as crumb, i (crumb.label)}
            {#if i > 0}
              <span class="page-header__crumb-sep" aria-hidden="true">/</span>
            {/if}
            {#if crumb.href}
              <a href={crumb.href}>{crumb.label}</a>
            {:else}
              <span class="page-header__crumb-cur">{crumb.label}</span>
            {/if}
          {/each}
        </nav>
      {/if}
      <h1 class="page-header__title">{title}</h1>
      {#if description}
        <p class="page-header__desc">{description}</p>
      {/if}
    </div>
  </div>
  {#if actions}
    <div class="page-header__actions">
      {@render actions()}
    </div>
  {/if}
</header>

<style>
  .page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-4);
    padding: var(--space-5) 0 var(--space-4);
  }

  .page-header__main {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    min-width: 0;
  }

  .page-header__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 40px;
    height: 40px;
    margin-top: 2px;
    border-radius: var(--radius-md);
    background: var(--accent-muted);
    color: var(--accent);
  }

  .page-header__crumbs {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
    font-size: var(--text-xs);
    color: var(--fg-muted);
  }

  .page-header__crumbs a {
    color: var(--fg-muted);
  }

  .page-header__crumbs a:hover {
    color: var(--accent);
  }

  .page-header__crumb-sep {
    opacity: 0.5;
  }

  .page-header__crumb-cur {
    font-weight: 600;
    color: var(--fg-secondary);
  }

  .page-header__title {
    font-size: var(--text-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: var(--leading-tight);
    color: var(--fg-primary);
  }

  .page-header__desc {
    margin-top: var(--space-1);
    max-width: 640px;
    color: var(--fg-secondary);
  }

  .page-header__actions {
    display: flex;
    align-items: center;
    flex: none;
    gap: var(--space-2);
  }
</style>
