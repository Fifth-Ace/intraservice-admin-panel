export type ServiceStatus='ok'|'warn'|'idle'|'backup';

export type ServiceMetric={name:string;sub:string;status:ServiceStatus;latency:string};
export type AuditEvent={icon:string;title:string;sub:string;time:string};
export type Metrics={
  uptime:number;
  operationsToday:number;
  avgApiMs:number;
  apiSamples:number;
  activeQueue:number;
  needsAttention:number;
  queue:{telegram:number;mail:number;ai:number;total:number};
  created:{today:{tg:number;mail:number;manual:number};total:{tg:number;mail:number;manual:number}};
  chart:{api:number;web:number;notebook:number;other:number};
  services:ServiceMetric[];
  operations:AuditEvent[];
  log:AuditEvent[];
};

export type QueueItem={id:number;created_at:string;tg_user_id?:string;username?:string;text:string;status:string};
export type QueueSnapshot={items:QueueItem[]};
export type LogItem={id:number;action:string;source:string;result:string;created_at:string};
export type LogSnapshot={items:LogItem[];hasMore:boolean};
export type TemplateItem={id:number;name:string;category:string;solution:string;default_minutes:number;use_count:number;active:boolean};
export type TemplateSnapshot={items:TemplateItem[]};
export type ConfigPerson={name:string;tg:string;username:string;intra:string;known:boolean;enabled:boolean};
export type SafeSecrets={intraservice_login:string;intraservice_password:{set:boolean};scheduler_token:{set:boolean};telegram_chat_id:string;intake_token:{set:boolean};intake_proxy:string;allowed_usernames:string[]};
export type ConfigSnapshot={writeEnabled:boolean;revision:string;config:Record<string,unknown>;people:ConfigPerson[];secrets:SafeSecrets};
