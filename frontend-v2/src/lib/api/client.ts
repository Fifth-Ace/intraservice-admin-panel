import {mockMetrics,mockQueue} from '../mock';
import type {ConfigSnapshot,LogSnapshot,Metrics,QueueSnapshot,TemplateSnapshot} from '../types';

const useMocks=import.meta.env.DEV||import.meta.env.VITE_USE_MOCKS==='1';

async function request<T>(path:string):Promise<T>{
  const response=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json'}});
  if(response.status===401){location.assign('/login');throw new Error('UNAUTHORIZED')}
  if(!response.ok)throw new Error(`HTTP_${response.status}`);
  return response.json() as Promise<T>;
}

const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export const api={
  async metrics():Promise<Metrics>{
    if(useMocks){await pause(120);return structuredClone(mockMetrics)}
    return request<Metrics>('/api/metrics');
  },
  async queue():Promise<QueueSnapshot>{
    if(useMocks){await pause(100);return structuredClone(mockQueue)}
    return request<QueueSnapshot>('/api/queue');
  },
  async log():Promise<LogSnapshot>{
    if(useMocks){await pause(100);return {items:mockMetrics.operations.map((x,index)=>({id:index+1,action:x.title,source:x.sub,result:'ok',created_at:new Date(Date.now()-index*60000).toISOString()})),hasMore:false}}
    return request<LogSnapshot>('/api/log?limit=50');
  },
  async templates():Promise<TemplateSnapshot>{
    if(useMocks){await pause(100);return {items:[{id:1,name:'Функциональная готовность',category:'Общие решения',solution:'Функциональная готовность восстановлена',default_minutes:15,use_count:18,active:true}]}}
    const data=await request<TemplateSnapshot>('/api/templates');return {...data,items:data.items.map(item=>({...item,active:Boolean(item.active)}))};
  },
  async config():Promise<ConfigSnapshot>{
    if(useMocks){await pause(100);return {writeEnabled:false,revision:'mock',config:{base_url:'https://example.invalid',timezone:'Europe/Moscow'},people:[],secrets:{intraservice_login:'operator',intraservice_password:{set:true},scheduler_token:{set:true},telegram_chat_id:'',intake_token:{set:true},intake_proxy:'',allowed_usernames:[]}}}
    return request<ConfigSnapshot>('/api/config');
  }
};
