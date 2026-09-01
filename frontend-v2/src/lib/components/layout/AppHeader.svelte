<script lang="ts">
  import { LifeBuoy, Menu, Moon, Sun, X } from '@lucide/svelte';
  import type { Component } from 'svelte';

  export interface AppNavItem {
    id: string;
    label: string;
    hash: string;
  }

  interface Props {
    /** id активного роута */
    active: string;
    items: AppNavItem[];
    theme: 'dark' | 'light';
    onThemeChange: (theme: 'dark' | 'light') => void;
    brand?: string;
    brandIcon?: Component;
    class?: string;
    [key: string]: unknown;
  }

  let {
    active,
    items,
    theme,
    onThemeChange,
    brand = 'IntraService Control',
    brandIcon = LifeBuoy,
    class: klass = '',
    ...rest
  }: Props = $props();

  let open = $state(false);

  let BrandIcon = $derived(brandIcon);

  function toggleTheme() {
    onThemeChange(theme === 'dark' ? 'light' : 'dark');
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }

  // Закрываем мобильное меню при переходе на desktop-раскладку
  $effect(() => {
    const mq = window.matchMedia('(min-width: 880px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) open = false;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  });

  // При открытии меню фокусируем первый пункт
  $effect(() => {
    if (!open) return;
    document.getElementById('app-header-menu')?.querySelector<HTMLAnchorElement>('a')?.focus();
  });
</script>

<svelte:window onkeydown={onKeydown} />

<header class="app-header {klass}">
  <div class="app-header__bar">
    <a class="app-header__brand" href="#/" aria-label="{brand} — на главную">
      <span class="app-header__brand-icon" aria-hidden="true">
        <BrandIcon size={18} />
      </span>
      <span class="app-header__brand-name">{brand}</span>
    </a>

    <nav class="app-header__nav" aria-label="Основная навигация">
      {#each items as item (item.id)}
        <a
          class="app-header__link {item.id === active ? 'is-active' : ''}"
          href={item.hash}
          aria-current={item.id === active ? 'page' : undefined}
        >{item.label}</a>
      {/each}
    </nav>

    <div class="app-header__tools">
      <button
        class="app-header__icon-btn"
        type="button"
        aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
        onclick={toggleTheme}
      >
        {#if theme === 'dark'}
          <Sun size={17} aria-hidden="true" />
        {:else}
          <Moon size={17} aria-hidden="true" />
        {/if}
      </button>
      <button
        class="app-header__icon-btn app-header__burger"
        type="button"
        aria-expanded={open}
        aria-controls="app-header-menu"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        onclick={() => (open = !open)}
      >
        {#if open}
          <X size={19} aria-hidden="true" />
        {:else}
          <Menu size={19} aria-hidden="true" />
        {/if}
      </button>
    </div>
  </div>

  {#if open}
    <nav id="app-header-menu" class="app-header__menu" aria-label="Мобильная навигация">
      {#each items as item (item.id)}
        <a
          class="app-header__menu-link {item.id === active ? 'is-active' : ''}"
          href={item.hash}
          aria-current={item.id === active ? 'page' : undefined}
          onclick={() => (open = false)}
        >{item.label}</a>
      {/each}
    </nav>
  {/if}
</header>

<style>
  .app-header {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    background: color-mix(in srgb, var(--bg-base) 82%, transparent);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
  }

  .app-header__bar {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    height: var(--header-height);
    max-width: var(--content-max);
    margin: 0 auto;
    padding: 0 var(--space-5);
  }

  .app-header__brand {
    display: inline-flex;
    align-items: center;
    flex: none;
    gap: var(--space-2);
    color: var(--fg-primary);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-decoration: none;
  }

  .app-header__brand:hover {
    text-decoration: none;
  }

  .app-header__brand-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    background: var(--accent-muted);
    color: var(--accent);
  }

  .app-header__brand-name {
    font-size: var(--text-lg);
  }

  .app-header__nav {
    display: none;
    align-items: center;
    gap: 2px;
    margin-left: var(--space-2);
  }

  .app-header__link {
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--fg-muted);
    text-decoration: none;
    transition:
      color var(--dur-fast) var(--ease-out),
      background-color var(--dur-fast) var(--ease-out);
  }

  .app-header__link:hover {
    color: var(--fg-primary);
    background: var(--bg-surface-2);
    text-decoration: none;
  }

  .app-header__link.is-active {
    color: var(--accent);
    background: var(--accent-muted);
  }

  .app-header__tools {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: auto;
  }

  .app-header__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--fg-secondary);
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease-out),
      color var(--dur-fast) var(--ease-out);
  }

  .app-header__icon-btn:hover {
    background: var(--bg-surface-2);
    color: var(--fg-primary);
  }

  .app-header__burger {
    display: inline-flex;
  }

  .app-header__menu {
    padding: var(--space-2) var(--space-4) var(--space-4);
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    animation: menu-in var(--dur-normal) var(--ease-out);
  }

  .app-header__menu-link {
    display: block;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--fg-secondary);
    text-decoration: none;
  }

  .app-header__menu-link:hover {
    background: var(--bg-surface-2);
    color: var(--fg-primary);
    text-decoration: none;
  }

  .app-header__menu-link.is-active {
    color: var(--accent);
    background: var(--accent-muted);
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (min-width: 880px) {
    .app-header__nav {
      display: flex;
    }

    .app-header__burger {
      display: none;
    }

    .app-header__menu {
      display: none;
    }
  }
</style>
