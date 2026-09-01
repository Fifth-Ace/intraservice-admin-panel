<script lang="ts">
  import type { ServiceMetric } from '../../types';
  import Card from '../ui/Card.svelte';
  import Badge from '../ui/Badge.svelte';
  import StatusDot from '../ui/StatusDot.svelte';
  import { AI_CHAIN, formatUptime, formatAvgApiMs, hasSamples, serviceTone } from './utils';

  interface Props {
    /** Независимые состояния production-модулей. */
    services: ServiceMetric[];
    uptime: number;
    avgApiMs: number | null;
    apiSamples: number | null;
  }

  let { services, uptime, avgApiMs, apiSamples }: Props = $props();
</script>

<div class="sys-grid">
  <!-- Карточки сервисов: read-only, без управляющих кнопок -->
  <section class="sys-block" aria-labelledby="sys-services-title">
    <div class="sys-heading">
      <h2 id="sys-services-title">Сервисы</h2>
      <span class="sys-heading__meta">Только чтение</span>
    </div>
    <div class="service-cards">
      {#each services as service (service.name)}
        {@const tone = serviceTone(service.status)}
        <Card padding="sm">
          <div class="service-card-body">
            <div class="service-card__top">
              <StatusDot status={tone.dot} pulse={service.status === 'ok'} label={service.status} />
              <strong class="service-card__name">{service.name}</strong>
            </div>
            <p class="service-card__sub">{service.sub}</p>
            <Badge size="sm" variant={tone.badge}>{service.latency}</Badge>
          </div>
        </Card>
      {:else}
        <Card padding="sm">
          <p class="sys-empty">Сервисы не загружены</p>
        </Card>
      {/each}
    </div>
  </section>

  <!-- AI-цепочка: Luna → Gemini 3.5 → Gemini 3.1 → DeepSeek -->
  <section class="sys-block" aria-labelledby="sys-ai-title">
    <div class="sys-heading">
      <h2 id="sys-ai-title">AI-цепочка</h2>
      <span class="sys-heading__meta">Обработка</span>
    </div>
    <Card padding="md">
      <div class="ai-chain">
        {#each AI_CHAIN as node, i (node.name)}
          <div class="ai-node">
            <span class="ai-node__index" aria-hidden="true">{i + 1}</span>
            <div class="ai-node__copy">
              <strong>{node.name}</strong>
              <span>{node.tag}</span>
            </div>
          </div>
          {#if i < AI_CHAIN.length - 1}
            <span class="ai-node__arrow" aria-hidden="true">→</span>
          {/if}
        {/each}
      </div>
    </Card>
  </section>
</div>

<!-- Компактная сводка: аптайм + API-латенция -->
<section class="sys-block" aria-labelledby="sys-summary-title">
  <div class="sys-heading">
    <h2 id="sys-summary-title">Состояние</h2>
  </div>
  <div class="summary-strip">
    <Card padding="sm">
      <div class="summary-strip__item">
        <span class="summary-strip__label">Аптайм</span>
        <strong class="summary-strip__value">{formatUptime(uptime)}</strong>
      </div>
    </Card>
    <Card padding="sm">
      <div class="summary-strip__item">
        <span class="summary-strip__label">Средняя задержка API</span>
        <strong class="summary-strip__value">{formatAvgApiMs(avgApiMs)}</strong>
        {#if hasSamples(apiSamples)}
          <span class="summary-strip__meta">{apiSamples} замеров</span>
        {:else}
          <span class="summary-strip__meta">нет замеров</span>
        {/if}
      </div>
    </Card>
  </div>
</section>

<style>
  .sys-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: start;
    gap: var(--space-5);
  }
  .sys-block {
    display: grid;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }
  .sys-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .sys-heading h2 {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .sys-heading__meta {
    font-size: var(--text-xs);
    color: var(--fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .service-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-3);
    align-items: start;
  }
  .service-card-body {
    display: grid;
    gap: var(--space-2);
    align-content: start;
  }
  .service-card__top {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .service-card__name {
    font-size: var(--text-sm);
    color: var(--fg-primary);
    overflow-wrap: anywhere;
  }
  .service-card__sub {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--fg-muted);
    line-height: var(--leading-normal);
  }
  .sys-empty {
    margin: 0;
    color: var(--fg-muted);
    font-size: var(--text-sm);
  }
  .ai-chain {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .ai-node {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 0 1 auto;
    min-width: 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-surface-2);
  }
  .ai-node__index {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    flex: none;
    border-radius: var(--radius-full);
    background: var(--accent-muted);
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 600;
  }
  .ai-node__copy {
    display: grid;
    gap: 1px;
    min-width: 0;
  }
  .ai-node__copy strong {
    font-size: var(--text-sm);
    color: var(--fg-primary);
    white-space: nowrap;
  }
  .ai-node__copy span {
    font-size: var(--text-xs);
    color: var(--fg-muted);
  }
  .ai-node__arrow {
    color: var(--fg-faint);
    font-size: var(--text-lg);
    flex: none;
  }
  .summary-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
    align-items: start;
  }
  .summary-strip__item {
    display: grid;
    gap: var(--space-1);
  }
  .summary-strip__label {
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--fg-muted);
  }
  .summary-strip__value {
    font-family: var(--font-mono);
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--accent);
  }
  .summary-strip__meta {
    font-size: var(--text-xs);
    color: var(--fg-muted);
  }
  @media (max-width: 900px) {
    .sys-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
