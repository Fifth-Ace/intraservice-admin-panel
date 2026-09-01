<script lang="ts">
  import Card from '../ui/Card.svelte';
  import Badge from '../ui/Badge.svelte';
  import StatusDot from '../ui/StatusDot.svelte';
  import {
    configBool,
    configString,
    secretLabel,
    secretSet,
  } from './settingsTemplatesUtils';

  export interface Person {
    name: string;
    tg?: string;
    username?: string;
    intra?: string;
    known?: boolean;
    enabled?: boolean;
  }

  interface Props {
    config: Record<string, unknown>;
    people: Person[];
    secrets: {
      intraservice_password: boolean;
      scheduler_token: boolean;
      intake_token: boolean;
      intraservice_login: string;
      telegram_chat_id: string;
      intake_proxy: string;
    };
    writeEnabled: boolean;
  }

  let { config, people, secrets, writeEnabled }: Props = $props();

  /* --- секции «Основное» --- */
  let botName = $derived(configString(config, 'bot_name'));
  let timezone = $derived(configString(config, 'timezone'));
  let mailCheckIntervalMin = $derived(configString(config, 'mail_check_interval_min'));
  let notificationsEnabled = $derived(configBool(config, 'notifications_enabled'));

  /* --- секция «Доступ»: безопасные строки (host + username, без секретов) --- */
  let loginString = $derived(secrets.intraservice_login);
  let chatString = $derived(secrets.telegram_chat_id);
  let proxyString = $derived(secrets.intake_proxy);
</script>

<section aria-label="Настройки">
  {#if !writeEnabled}
    <div class="settings-banner">
      <Card padding="md">
        <p class="set-readonly-banner">Редактирование отключено — страница только для чтения.</p>
      </Card>
    </div>
  {/if}

  <!-- ================= Основное ================= -->
  <section class="set-block" aria-labelledby="set-main-title">
    <header class="set-heading">
      <div>
        <h2 id="set-main-title">Основное</h2>
        <p class="set-heading__hint">Базовые параметры бота</p>
      </div>
    </header>
    <Card padding="md">
      <dl class="set-list">
        <div class="set-row">
          <dt>Имя бота</dt>
          <dd>{botName || '—'}</dd>
        </div>
        <div class="set-row">
          <dt>Часовой пояс</dt>
          <dd>{timezone || '—'}</dd>
        </div>
        <div class="set-row">
          <dt>Период проверки почты</dt>
          <dd>{mailCheckIntervalMin ? `${mailCheckIntervalMin} мин` : '—'}</dd>
        </div>
        <div class="set-row">
          <dt>Уведомления</dt>
          <dd>
            <span class="set-row__value-inline">
              <StatusDot status={notificationsEnabled ? 'success' : 'idle'} size="sm" label={notificationsEnabled ? 'включены' : 'выключены'} />
              <span>{notificationsEnabled ? 'включены' : 'выключены'}</span>
            </span>
          </dd>
        </div>
      </dl>
    </Card>
  </section>

  <!-- ================= Подключение ================= -->
  <section class="set-block" aria-labelledby="set-conn-title">
    <header class="set-heading">
      <div>
        <h2 id="set-conn-title">Подключение</h2>
        <p class="set-heading__hint">Каналы приёма и транспорта</p>
      </div>
    </header>
    <Card padding="md">
      <dl class="set-list">
        <div class="set-row">
          <dt>Пользователи</dt>
          <dd class="set-people">
            {#if people.length === 0}
              <span class="set-empty">нет пользователей</span>
            {:else}
              <ul class="set-people__list">
                {#each people as p (p.name)}
                  <li class="set-person">
                    <span class="set-person__head">
                      <StatusDot status={p.enabled === false ? 'idle' : 'success'} size="sm" label={p.enabled === false ? 'отключён' : 'активен'} />
                      <strong class="set-person__name">{p.name}</strong>
                      {#if !p.known}
                        <Badge size="sm" variant="warning">неизвестный</Badge>
                      {/if}
                      {#if p.enabled === false}
                        <Badge size="sm" variant="danger">отключён</Badge>
                      {/if}
                    </span>
                    {#if p.tg || p.username || p.intra}
                      <span class="set-person__meta">
                        {#if p.tg}Telegram: {p.tg}{/if}
                        {#if p.username}{#if p.tg} · {/if}@{p.username}{/if}
                        {#if p.intra}{#if p.tg || p.username} · {/if}Intra: {p.intra}{/if}
                      </span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </dd>
        </div>
      </dl>
    </Card>
  </section>

  <!-- ================= Доступ ================= -->
  <section class="set-block" aria-labelledby="set-access-title">
    <header class="set-heading">
      <div>
        <h2 id="set-access-title">Доступ</h2>
        <p class="set-heading__hint">Учётные записи и безопасные строки</p>
      </div>
    </header>
    <Card padding="md">
      <dl class="set-list">
        <!-- Секреты: только «задан / не задан», никаких значений, input'ов и кнопок сохранения -->
        <div class="set-row">
          <dt>Пароль IntraService</dt>
          <dd>
            <Badge size="sm" variant={secretSet(secrets, 'intraservice_password') ? 'success' : 'neutral'}>
              {secretLabel(secretSet(secrets, 'intraservice_password'))}
            </Badge>
          </dd>
        </div>
        <div class="set-row">
          <dt>Токен планировщика</dt>
          <dd>
            <Badge size="sm" variant={secretSet(secrets, 'scheduler_token') ? 'success' : 'neutral'}>
              {secretLabel(secretSet(secrets, 'scheduler_token'))}
            </Badge>
          </dd>
        </div>
        <div class="set-row">
          <dt>Токен приёма</dt>
          <dd>
            <Badge size="sm" variant={secretSet(secrets, 'intake_token') ? 'success' : 'neutral'}>
              {secretLabel(secretSet(secrets, 'intake_token'))}
            </Badge>
          </dd>
        </div>
        <div class="set-row">
          <dt>Логин IntraService</dt>
          <dd>{loginString || '—'}</dd>
        </div>
        <div class="set-row">
          <dt>Chat ID планировщика</dt>
          <dd>{chatString || '—'}</dd>
        </div>
        <div class="set-row">
          <dt>Telegram proxy</dt>
          <dd>{proxyString || '—'}</dd>
        </div>
      </dl>
    </Card>
  </section>
</section>

<style>
  .set-readonly-banner {
    margin: 0;
    padding: var(--space-1) var(--space-2);
    color: var(--fg-muted);
    font-size: var(--text-sm);
  }
  .set-block {
    display: grid;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }
  .set-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .set-heading h2 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .set-heading__hint {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--fg-muted);
  }
  .set-list {
    display: grid;
    gap: 0;
    margin: 0;
  }
  .set-row {
    display: grid;
    grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
    gap: var(--space-4);
    align-items: baseline;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border);
  }
  .set-row:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
  .set-row dt {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--fg-secondary);
  }
  .set-row dd {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--fg-primary);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .set-row__value-inline {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }
  .set-empty {
    color: var(--fg-muted);
  }
  .set-people__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .set-person {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }
  .set-person__head {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .set-person__name {
    font-size: var(--text-sm);
    color: var(--fg-primary);
    overflow-wrap: anywhere;
  }
  .set-person__meta {
    font-size: var(--text-xs);
    color: var(--fg-muted);
    overflow-wrap: anywhere;
  }
  @media (max-width: 600px) {
    .set-row {
      grid-template-columns: 1fr;
      gap: var(--space-1);
    }
  }
  .settings-banner { margin-bottom: var(--space-4); }
</style>
