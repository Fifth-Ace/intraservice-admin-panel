<script lang="ts">
  import {onDestroy,onMount} from 'svelte';
  import type {Component} from 'svelte';
  import {Activity,BookOpen,Boxes,ClipboardList,RefreshCw,Settings,ShieldCheck} from '@lucide/svelte';
  import AppHeader from './lib/components/layout/AppHeader.svelte';
  import PageHeader from './lib/components/layout/PageHeader.svelte';
  import Badge from './lib/components/ui/Badge.svelte';
  import Button from './lib/components/ui/Button.svelte';
  import Card from './lib/components/ui/Card.svelte';
  import StatStrip from './lib/components/ui/StatStrip.svelte';
  import StatusDot from './lib/components/ui/StatusDot.svelte';
  import SystemPage from './lib/components/pages/SystemPage.svelte';
  import LogPage from './lib/components/pages/LogPage.svelte';
  import TemplatesPage from './lib/components/pages/TemplatesPage.svelte';
  import SettingsPage from './lib/components/pages/SettingsPage.svelte';
  import {api} from './lib/api/client';
  import {NAV_ITEMS,routeFromHash,type RouteId} from './lib/navigation';
  import {createPollingStore,type PollingState} from './lib/stores/polling';
  import type {ConfigSnapshot,LogSnapshot,Metrics,QueueSnapshot,ServiceMetric,TemplateSnapshot} from './lib/types';

  const metricsStore=createPollingStore(api.metrics,10000);
  const queueStore=createPollingStore(api.queue,12000);
  const logStore=createPollingStore(api.log,15000);
  const templatesStore=createPollingStore(api.templates,30000);
  const configStore=createPollingStore(api.config,30000);
  let metrics=$state<PollingState<Metrics>>({data:null,status:'idle',error:null,updatedAt:0});
  let queue=$state<PollingState<QueueSnapshot>>({data:null,status:'idle',error:null,updatedAt:0});
  let log=$state<PollingState<LogSnapshot>>({data:null,status:'idle',error:null,updatedAt:0});
  let templates=$state<PollingState<TemplateSnapshot>>({data:null,status:'idle',error:null,updatedAt:0});
  let config=$state<PollingState<ConfigSnapshot>>({data:null,status:'idle',error:null,updatedAt:0});
  const unsubMetrics=metricsStore.subscribe(value=>metrics=value);
  const unsubQueue=queueStore.subscribe(value=>queue=value);
  const unsubLog=logStore.subscribe(value=>log=value);
  const unsubTemplates=templatesStore.subscribe(value=>templates=value);
  const unsubConfig=configStore.subscribe(value=>config=value);

  let route=$state<RouteId>('overview');
  let theme=$state<'dark'|'light'>('dark');

  const pageMeta:Record<RouteId,{title:string;description:string;icon:Component}>={
    overview:{title:'Обзор',description:'Состояние бота, каналов и очередей',icon:Activity},
    tickets:{title:'Заявки',description:'Очередь обработки и подготовленные обращения',icon:ClipboardList},
    templates:{title:'Шаблоны',description:'Категории и формулировки решений',icon:BookOpen},
    system:{title:'Система',description:'Сервисы, API и AI-цепочка',icon:Boxes},
    log:{title:'Журнал',description:'Безопасный поток событий панели и бота',icon:ShieldCheck},
    settings:{title:'Настройки',description:'Подключение, доступ и параметры интерфейса',icon:Settings}
  };

  function setTheme(next:'dark'|'light'){
    theme=next;
    document.documentElement.dataset.theme=next;
    localStorage.setItem('panel-v2-theme',next);
  }
  function syncRoute(){route=routeFromHash(location.hash)}
  function formatUptime(seconds:number){
    const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);
    return hours?`${hours}ч ${minutes}м`:`${minutes}м`;
  }
  function dotStatus(service:ServiceMetric){
    return service.status==='ok'?'success':service.status==='warn'?'warning':service.status==='backup'?'info':'idle';
  }

  onMount(()=>{
    theme=localStorage.getItem('panel-v2-theme')==='light'?'light':'dark';
    document.documentElement.dataset.theme=theme;
    syncRoute();
    window.addEventListener('hashchange',syncRoute);
  });
  onDestroy(()=>{
    window.removeEventListener('hashchange',syncRoute);
    unsubMetrics();unsubQueue();unsubLog();unsubTemplates();unsubConfig();metricsStore.destroy();queueStore.destroy();logStore.destroy();templatesStore.destroy();configStore.destroy();
  });
</script>

<AppHeader active={route} items={NAV_ITEMS} {theme} onThemeChange={setTheme}/>

<main class="page-shell">
  <PageHeader title={pageMeta[route].title} description={pageMeta[route].description} icon={pageMeta[route].icon}>
    {#snippet actions()}
      <Badge variant={metrics.status==='error'?'danger':metrics.status==='ready'?'success':'neutral'} dot>
        {metrics.status==='error'?'Ошибка данных':metrics.status==='ready'?'Данные актуальны':'Загрузка'}
      </Badge>
      {#if route!=='templates' && route!=='log'}
        <Button size="sm" variant="outline" onclick={()=>Promise.all([metricsStore.refresh(),queueStore.refresh()])}>
          <RefreshCw size={14}/> Обновить
        </Button>
      {/if}
    {/snippet}
  </PageHeader>

  {#if route==='overview'}
    {#if metrics.data}
      <StatStrip columns={4} items={[
        {label:'Время работы',value:formatUptime(metrics.data.uptime),tone:'success'},
        {label:'Операций сегодня',value:metrics.data.operationsToday,tone:'accent'},
        {label:'API-чтение · 24 ч',value:metrics.data.avgApiMs?`${metrics.data.avgApiMs} мс`:'—',hint:`${metrics.data.apiSamples} замеров`},
        {label:'Требуют внимания',value:metrics.data.needsAttention,tone:metrics.data.needsAttention?'warning':'success'}
      ]}/>

      <section class="section-grid section-grid--wide">
        <Card padding="md">
          <div class="section-heading"><div><h2>Сервисы</h2><p>Независимые состояния production-модулей</p></div><a href="#/system">Подробнее →</a></div>
          <div class="service-list">
            {#each metrics.data.services as service (service.name)}
              <div class="service-row">
                <StatusDot status={dotStatus(service)} pulse={service.status==='ok'} label={service.status}/>
                <div class="service-copy"><strong>{service.name}</strong><span>{service.sub}</span></div>
                <Badge size="sm" variant={service.status==='ok'?'success':service.status==='warn'?'warning':'neutral'}>{service.latency}</Badge>
              </div>
            {/each}
          </div>
        </Card>

        <Card padding="md">
          <div class="section-heading"><div><h2>Создано по каналам</h2><p>Сегодня · всего</p></div></div>
          <div class="channel-grid">
            <div><strong>{metrics.data.created.today.tg}</strong><span>Telegram</span><small>{metrics.data.created.total.tg} всего</small></div>
            <div><strong>{metrics.data.created.today.mail}</strong><span>Почта</span><small>{metrics.data.created.total.mail} всего</small></div>
            <div><strong>{metrics.data.created.today.manual}</strong><span>Вручную</span><small>{metrics.data.created.total.manual} всего</small></div>
          </div>
          <div class="queue-summary">
            <span>В очереди</span><strong>{metrics.data.queue.total}</strong>
            <small>Telegram {metrics.data.queue.telegram} · Почта {metrics.data.queue.mail} · AI {metrics.data.queue.ai}</small>
          </div>
        </Card>
      </section>

      <Card padding="md">
        <div class="section-heading"><div><h2>Последние события</h2><p>Только фактический audit_log</p></div><a href="#/log">Весь журнал →</a></div>
        <div class="event-list">
          {#each metrics.data.operations as event,index (`${event.title}-${event.sub}-${event.time}-${index}`)}
            <div class="event-row"><span class="event-icon">{event.icon}</span><div><strong>{event.title}</strong><span>{event.sub}</span></div><time>{event.time}</time></div>
          {:else}<div class="empty">Событий пока нет</div>{/each}
        </div>
      </Card>
    {:else}
      <Card padding="lg"><div class="empty">Загружаем состояние панели…</div></Card>
    {/if}
  {:else if route==='tickets'}
    <Card padding="lg">
      <div class="section-heading"><div><h2>Очередь обработки</h2><p>На первом этапе — только просмотр mock-данных</p></div><Badge variant="accent">{queue.data?.items.length??0} записей</Badge></div>
      <div class="ticket-list">
        {#each queue.data?.items??[] as item (item.id)}
          <article class="ticket-row"><div><strong>#{item.id} · {item.status}</strong><p>{item.text}</p></div><Button size="sm" variant="ghost">Открыть</Button></article>
        {:else}<div class="empty">Очередь пуста</div>{/each}
      </div>
    </Card>
  {:else if route==='system'}
    <SystemPage services={metrics.data?.services??[]} uptime={metrics.data?.uptime??0} avgApiMs={metrics.data?.avgApiMs??null} apiSamples={metrics.data?.apiSamples??null}/>
  {:else if route==='log'}
    <LogPage items={log.data?.items??[]} loading={log.status==='loading'} error={log.error} onRefresh={()=>void logStore.refresh()}/>
  {:else if route==='templates'}
    <TemplatesPage items={templates.data?.items??[]} loading={templates.status==='loading'} error={templates.error} onRefresh={()=>void templatesStore.refresh()}/>
  {:else if route==='settings' && config.data}
    <SettingsPage config={config.data.config} people={config.data.people} writeEnabled={config.data.writeEnabled} secrets={{intraservice_password:config.data.secrets.intraservice_password.set,scheduler_token:config.data.secrets.scheduler_token.set,intake_token:config.data.secrets.intake_token.set,intraservice_login:config.data.secrets.intraservice_login,telegram_chat_id:config.data.secrets.telegram_chat_id,intake_proxy:config.data.secrets.intake_proxy}}/>
  {:else}
    {@const PlaceholderIcon=pageMeta[route].icon}
    <Card padding="lg">
      <div class="placeholder"><PlaceholderIcon size={30}/><h2>{pageMeta[route].title}</h2><p>Каркас маршрута готов. Данные и безопасные действия подключим отдельным проверяемым этапом.</p><Badge variant="neutral">frontend-v2 · mock mode</Badge></div>
    </Card>
  {/if}
</main>

<style>
  .page-shell{max-width:var(--content-max);margin:0 auto;padding:0 var(--space-5) var(--space-8)}
  .section-grid{display:grid;align-items:start;gap:var(--space-4);margin:var(--space-4) 0}.section-grid--wide{grid-template-columns:minmax(0,1.5fr) minmax(300px,.8fr)}
  .section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-3)}
  .section-heading h2{font-size:var(--text-lg);margin:0 0 2px}.section-heading p{margin:0;color:var(--fg-muted);font-size:var(--text-sm)}.section-heading a{font-size:var(--text-sm);white-space:nowrap}
  .service-list,.event-list,.ticket-list{display:grid}.service-row,.event-row,.ticket-row{display:flex;align-items:center;gap:var(--space-3);min-width:0;padding:10px 0;border-bottom:1px solid var(--border-subtle)}
  .service-row:last-child,.event-row:last-child,.ticket-row:last-child{border-bottom:0}.service-copy,.event-row>div,.ticket-row>div{display:grid;gap:2px;min-width:0;flex:1}.service-copy span,.event-row span,.ticket-row p{color:var(--fg-muted);font-size:var(--text-sm);margin:0}.event-row time{color:var(--fg-muted);font-size:var(--text-xs);white-space:nowrap}.event-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:var(--radius-sm);background:var(--accent-muted);color:var(--accent)}
  .channel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)}.channel-grid>div{display:grid;gap:2px;padding:var(--space-3);border-radius:var(--radius-md);background:var(--bg-surface-2)}.channel-grid strong{font-size:var(--text-xl)}.channel-grid span,.channel-grid small{color:var(--fg-muted);font-size:var(--text-xs)}
  .queue-summary{display:grid;grid-template-columns:1fr auto;gap:4px;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border)}.queue-summary strong{font-size:var(--text-xl);color:var(--accent)}.queue-summary small{grid-column:1/-1;color:var(--fg-muted)}
  .ticket-row{justify-content:space-between}.placeholder,.empty{display:grid;place-items:center;text-align:center;gap:var(--space-3);min-height:140px;color:var(--fg-muted)}.placeholder h2,.placeholder p{margin:0}.placeholder p{max-width:560px}
  @media(max-width:840px){.section-grid--wide{grid-template-columns:1fr}.page-shell{padding-inline:var(--space-3)}.event-row{align-items:flex-start}.event-row time{display:none}}
</style>
