import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';

const clean=v=>String(v??'').trim();
const sha=v=>createHash('sha256').update(v).digest('hex');
const safeName=v=>clean(v).replace(/[^\p{L}\p{N}_. -]+/gu,' ').replace(/\s+/g,' ').slice(0,120);

export function parseEnv(text=''){
 const out={};
 for(const line of String(text).split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(m)out[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}
 return out;
}
export function updateEnv(text='',updates={}){
 const pending=new Map(Object.entries(updates).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)])),lines=String(text).split(/\r?\n/),out=[];
 for(const line of lines){const m=line.match(/^(\s*)([A-Z0-9_]+)(\s*=).*$/);if(!m||!pending.has(m[2])){out.push(line);continue}const value=pending.get(m[2]);pending.delete(m[2]);out.push(`${m[1]}${m[2]}${m[3]}${value}`)}
 while(out.length&&out.at(-1)==='')out.pop();
 if(pending.size){if(out.length)out.push('');for(const [key,value] of pending)out.push(`${key}=${value}`)}
 return out.join('\n')+'\n';
}
function executorsFromParser(text=''){
 const rows=[];
 for(const line of String(text).split('\n')){const name=line.match(/name:'([^']+)'/)?.[1],tg=line.match(/\btg:'([^']+)'/)?.[1],intra=line.match(/\bintra:'([^']+)'/)?.[1];if(name&&tg)rows.push({name,tg,intra:intra||'',known:true})}
 return rows;
}
function validUrl(v,{allowEmpty=false}={}){if(!v&&allowEmpty)return '';let u;try{u=new URL(v)}catch{throw Error('Некорректный URL')}if(!['http:','https:'].includes(u.protocol))throw Error('URL должен начинаться с http:// или https://');return u.toString().replace(/\/$/,'')}
function validToken(v,label){if(!v)return '';if(!/^\d{6,}:[A-Za-z0-9_-]{20,}$/u.test(v))throw Error(`${label}: неверный формат токена`);return v}
function validId(v,label,{empty=false}={}){v=clean(v);if(!v&&empty)return '';if(!/^[-]?\d{5,20}$/u.test(v))throw Error(`${label}: ожидается числовой Telegram ID`);return v}
function normalizeProfiles(rows,known){
 if(!Array.isArray(rows)||rows.length>100)throw Error('Некорректный список доступа');
 const knownMap=new Map(known.map(x=>[x.tg,x])),seen=new Set(),out=[];
 for(const raw of rows){const tg=validId(raw.tg,'Telegram ID');if(seen.has(tg))throw Error(`Telegram ID ${tg} указан дважды`);seen.add(tg);const base=knownMap.get(tg),name=safeName(raw.name||base?.name);if(name.length<2)throw Error(`Не указано имя для ${tg}`);const username=clean(raw.username).replace(/^@/,'');if(username&&!/^[A-Za-z0-9_]{3,32}$/u.test(username))throw Error(`Некорректный username для ${name}`);out.push({name,tg,username,intra:base?.intra||clean(raw.intra),known:Boolean(base),enabled:Boolean(raw.enabled)})}
 if(!out.some(x=>x.enabled))throw Error('Нельзя отключить всех пользователей');return out;
}
async function readOptional(file,fallback=''){try{return await fs.readFile(file,'utf8')}catch(e){if(e.code==='ENOENT')return fallback;throw e}}
async function atomicWrite(file,text,mode=0o600){await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});const tmp=`${file}.${process.pid}.${randomBytes(5).toString('hex')}.tmp`;await fs.writeFile(tmp,text,{mode,flag:'wx'});await fs.rename(tmp,file);await fs.chmod(file,mode)}

export class PanelConfigStore{
 constructor({configFile,intraEnvFile,intakeEnvFile,parserFile,accessFile,backupDir}){Object.assign(this,{configFile,intraEnvFile,intakeEnvFile,parserFile,accessFile,backupDir})}
 async raw(){const [configText,intraText,intakeText,parserText,metaText]=await Promise.all([readOptional(this.configFile,'{}\n'),readOptional(this.intraEnvFile,''),readOptional(this.intakeEnvFile,''),readOptional(this.parserFile,''),readOptional(this.accessFile,'[]\n')]);return{configText,intraText,intakeText,parserText,metaText,revision:sha(configText+'\0'+intraText+'\0'+intakeText+'\0'+metaText)}}
 async read(){const raw=await this.raw(),config=JSON.parse(raw.configText),intra=parseEnv(raw.intraText),intake=parseEnv(raw.intakeText),known=executorsFromParser(raw.parserText),allowed=new Set((intake.TELEGRAM_ALLOWED_USERS||'').split(',').map(clean).filter(Boolean)),usernames=(intake.TELEGRAM_ALLOWED_USERNAMES||'').split(',').map(clean).filter(Boolean);let meta=[];try{meta=JSON.parse(raw.metaText)}catch{}
  const metaByTg=new Map((Array.isArray(meta)?meta:[]).map(x=>[String(x.tg),x])),people=known.map(x=>({...x,username:metaByTg.get(x.tg)?.username||'',enabled:allowed.has(x.tg)}));for(const x of Array.isArray(meta)?meta:[])if(!people.some(p=>p.tg===String(x.tg)))people.push({name:safeName(x.name)||'Дополнительный пользователь',tg:String(x.tg),username:clean(x.username),intra:'',known:false,enabled:allowed.has(String(x.tg))});
  return{revision:raw.revision,config,people,secrets:{intraservice_login:intra.INTRASERVICE_LOGIN||'',intraservice_password:{set:Boolean(intra.INTRASERVICE_PASSWORD)},scheduler_token:{set:Boolean(intra.TELEGRAM_BOT_TOKEN)},telegram_chat_id:intra.TELEGRAM_CHAT_ID||'',intake_token:{set:Boolean(intake.TELEGRAM_BOT_TOKEN)},intake_proxy:intake.TELEGRAM_PROXY||'',allowed_usernames:usernames},db:{},_raw:raw};
 }
 async preview(input={}){const state=await this.read();if(clean(input.revision)!==state.revision)throw Object.assign(Error('Конфигурация изменилась. Обновите страницу.'),{status:409});const raw=state._raw,config=structuredClone(state.config),intra=parseEnv(raw.intraText),intake=parseEnv(raw.intakeText),summary=[],files={};
  if(input.connection){const c=input.connection;baseValidate(c);const base=validUrl(clean(c.base_url));if(base!==String(config.base_url||'')){config.base_url=base;summary.push('Адрес IntraService')}
   const iu={};if(clean(c.intraservice_login)!==(intra.INTRASERVICE_LOGIN||'')){iu.INTRASERVICE_LOGIN=clean(c.intraservice_login);summary.push('Логин IntraService')}if(clean(c.intraservice_password)){iu.INTRASERVICE_PASSWORD=clean(c.intraservice_password);summary.push('Пароль IntraService будет заменён')}if(clean(c.scheduler_token)){iu.TELEGRAM_BOT_TOKEN=validToken(clean(c.scheduler_token),'Токен планировщика');summary.push('Токен планировщика будет заменён')}const chat=validId(c.telegram_chat_id,'Chat ID',{empty:true});if(chat!==(intra.TELEGRAM_CHAT_ID||'')){iu.TELEGRAM_CHAT_ID=chat;summary.push('Chat ID планировщика')}
   const tu={};if(clean(c.intake_token)){tu.TELEGRAM_BOT_TOKEN=validToken(clean(c.intake_token),'Токен intake-бота');summary.push('Токен intake-бота будет заменён')}const proxy=validUrl(clean(c.intake_proxy),{allowEmpty:true});if(proxy!==(intake.TELEGRAM_PROXY||'')){tu.TELEGRAM_PROXY=proxy;summary.push('Telegram proxy')}
   const nextConfig=JSON.stringify(config,null,2)+'\n',nextIntra=updateEnv(raw.intraText,iu),nextIntake=updateEnv(raw.intakeText,tu);if(nextConfig!==raw.configText)files.config=nextConfig;if(nextIntra!==raw.intraText)files.intra=nextIntra;if(nextIntake!==raw.intakeText)files.intake=nextIntake;
  }
  if(input.access){const known=executorsFromParser(raw.parserText),profiles=normalizeProfiles(input.access,known),ids=profiles.filter(x=>x.enabled).map(x=>x.tg),names=profiles.filter(x=>x.enabled&&x.username).map(x=>x.username),nextIntake=updateEnv(files.intake??raw.intakeText,{TELEGRAM_ALLOWED_USERS:ids.join(','),TELEGRAM_ALLOWED_USERNAMES:names.join(',')}),meta=profiles.map(({name,tg,username,enabled})=>({name,tg,username,enabled})),nextMeta=JSON.stringify(meta,null,2)+'\n';if(nextIntake!==(files.intake??raw.intakeText))files.intake=nextIntake;if(nextMeta!==raw.metaText)files.access=nextMeta;summary.push(`Доступ: ${ids.length} активных пользователей`)}
  if(!summary.length||!Object.keys(files).length)throw Object.assign(Error('Нет изменений для сохранения'),{status:400});return{revision:state.revision,summary:[...new Set(summary)],files};
 }
 async apply(prepared){const current=await this.raw();if(current.revision!==prepared.revision)throw Object.assign(Error('Конфигурация изменилась после предпросмотра'),{status:409});await fs.mkdir(this.backupDir,{recursive:true,mode:0o700});const stamp=new Date().toISOString().replace(/[:.]/g,'-'),targets={config:this.configFile,intra:this.intraEnvFile,intake:this.intakeEnvFile,access:this.accessFile},old={config:current.configText,intra:current.intraText,intake:current.intakeText,access:current.metaText},written=[];
  try{for(const [key,text] of Object.entries(prepared.files)){const target=targets[key];await fs.writeFile(path.join(this.backupDir,`${stamp}-${path.basename(target)}.bak`),old[key],{mode:0o600});await atomicWrite(target,text,0o600);written.push(key)}}catch(error){for(const key of written.reverse())await atomicWrite(targets[key],old[key],0o600).catch(()=>{});throw error}
  await this.trimBackups();return{revision:(await this.raw()).revision,changed:written};
 }
 async trimBackups(){const rows=(await fs.readdir(this.backupDir,{withFileTypes:true})).filter(x=>x.isFile()).map(x=>x.name).sort().reverse();for(const name of rows.slice(60))await fs.unlink(path.join(this.backupDir,name)).catch(()=>{})}
}
function baseValidate(c){const login=clean(c.intraservice_login);if(!login||login.length>120||/[\r\n]/u.test(login))throw Error('Укажите корректный логин IntraService');for(const [k,v] of Object.entries(c))if(String(v??'').length>4096)throw Error(`Слишком длинное значение: ${k}`)}
