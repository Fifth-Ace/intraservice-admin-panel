<script lang="ts">
  type Status = 'success' | 'warning' | 'danger' | 'info' | 'idle' | 'offline';

  interface Props {
    status?: Status;
    size?: 'sm' | 'md' | 'lg';
    /** Мягкая пульсация — признак «живого» состояния */
    pulse?: boolean;
    /** Доступное имя статуса; без него точка считается декоративной */
    label?: string;
    class?: string;
    [key: string]: unknown;
  }

  let {
    status = 'idle',
    size = 'md',
    pulse = false,
    label = '',
    class: klass = '',
    ...rest
  }: Props = $props();

  let cls = $derived([
    'status-dot',
    `status-dot--${status}`,
    `status-dot--${size}`,
    pulse ? 'is-pulse' : '',
    klass,
  ]
    .filter(Boolean)
    .join(' '));
</script>

<span
  {...rest}
  class={cls}
  role={label ? 'img' : undefined}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : true}
></span>

<style>
  .status-dot {
    display: inline-block;
    flex: none;
    vertical-align: middle;
    border-radius: var(--radius-full);
    background: var(--neutral);
    --dot-color: var(--neutral);
  }

  .status-dot--sm {
    width: 7px;
    height: 7px;
  }

  .status-dot--md {
    width: 9px;
    height: 9px;
  }

  .status-dot--lg {
    width: 12px;
    height: 12px;
  }

  .status-dot--success {
    background: var(--success);
    --dot-color: var(--success);
  }

  .status-dot--warning {
    background: var(--warning);
    --dot-color: var(--warning);
  }

  .status-dot--danger {
    background: var(--danger);
    --dot-color: var(--danger);
  }

  .status-dot--info {
    background: var(--info);
    --dot-color: var(--info);
  }

  .status-dot--idle {
    background: var(--neutral);
    --dot-color: var(--neutral);
  }

  .status-dot--offline {
    background: var(--fg-faint);
    --dot-color: var(--fg-faint);
  }

  .is-pulse {
    animation: status-pulse 2s var(--ease-out) infinite;
  }

  @keyframes status-pulse {
    0% {
      box-shadow: 0 0 0 0 var(--dot-color);
    }
    70% {
      box-shadow: 0 0 0 6px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }
</style>
