import type {Metrics,QueueSnapshot} from './types';

export const mockMetrics:Metrics={
  uptime:86400+7320,
  operationsToday:18,
  avgApiMs:166,
  apiSamples:4,
  activeQueue:2,
  needsAttention:1,
  queue:{telegram:1,mail:1,ai:0,total:2},
  created:{today:{tg:6,mail:3,manual:2},total:{tg:184,mail:96,manual:41}},
  chart:{api:14,web:1,notebook:2,other:1},
  services:[
    {name:'Telegram intake',sub:'Приём и управление заявками',status:'ok',latency:'active'},
    {name:'Mail watcher',sub:'Почтовые заявки',status:'ok',latency:'active'},
    {name:'Планировщик',sub:'Плановые заявки и одобрение',status:'ok',latency:'active'},
    {name:'AI analyzers',sub:'Luna → Gemini → DeepSeek',status:'ok',latency:'active'},
    {name:'Official API',sub:'Основной транспорт',status:'ok',latency:'166 мс'},
    {name:'Playwright',sub:'Аварийный резерв',status:'idle',latency:'не использовался'}
  ],
  operations:[
    {icon:'✓',title:'Заявка создана',sub:'Official API · Telegram',time:'2 мин назад'},
    {icon:'↗',title:'Почтовая заявка назначена',sub:'Mail watcher',time:'18 мин назад'},
    {icon:'◇',title:'AI-разбор завершён',sub:'gpt-5.6-luna',time:'34 мин назад'}
  ],
  log:[]
};

export const mockQueue:QueueSnapshot={items:[
  {id:101,created_at:new Date().toISOString(),username:'operator',text:'Не печатает МФУ, кабинет 205',status:'preview'},
  {id:102,created_at:new Date().toISOString(),text:'Требуется уточнить местонахождение',status:'needs_clarification'}
]};
