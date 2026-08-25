import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadAccount,saveAccount,hashPassword,verifyPassword,passwordPolicy,SessionStore,LoginLimiter,parseCookies,randomToken} from './auth.mjs';
import {renderAuthPage,renderSetupRequired} from './auth-pages.mjs';
import {PanelConfigStore} from './panel_config.mjs';

const project=path.dirname(fileURLToPath(import.meta.url));
const dashboardFile=path.join(project,'docs','index.html');
const authFile=process.env.PANEL_AUTH_FILE||path.join(project,'data','auth.json');
const botDb=process.env.PANEL_BOT_DB||path.join(project,'..','intraservice-server-bot','data','intake.sqlite3');
const mailDb=process.env.PANEL_MAIL_DB||path.join(project,'..','intraservice-server-bot','data','mail_watcher.sqlite3');
const botDir=process.env.PANEL_BOT_DIR||path.join(project,'..','intraservice-server-bot');
const botConfigFile=path.join(botDir,'config.json');
const botEnvFile=path.join(botDir,'data','intraservice.env');
const intakeEnvFile=path.join(botDir,'data','intake.env');
const botParserFile=path.join(botDir,'intake_parser.mjs');
const panelAccessFile=process.env.PANEL_ACCESS_FILE||path.join(project,'data','panel-access.json');
const configBackupDir=process.env.PANEL_CONFIG_BACKUP_DIR||path.join(project,'data','config-backups');
const host=process.env.PANEL_HOST||'0.0.0.0',port=Number(process.env.PANEL_PORT||9120);
const sessions=new SessionStore(),limiter=new LoginLimiter(),loginTokens=new Map();
const configWriteEnabled=process.env.PANEL_ENABLE_CONFIG_WRITE==='1',configRestartEnabled=process.env.PANEL_RESTART_SERVICES!=='0';
const configStore=new PanelConfigStore({configFile:botConfigFile,intraEnvFile:botEnvFile,intakeEnvFile,parserFile:botParserFile,accessFile:panelAccessFile,backupDir:configBackupDir}),configPreviews=new Map();
let account=null;
try{account=await loadAccount(authFile)}catch(error){if(error.code!=='ENOENT')throw error}

const baseHeaders={
 'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
 'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Cache-Control':'no-store','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin'
};
function dbQ(dbPath,readonly,sql,params=[]){
 let i=0;const render=sql.replaceAll('?',()=>params[i++]===null?'NULL':`'${String(params[i-1]).replaceAll("'","''")}'`);
 return execFileSync('sqlite3',[(readonly?'-readonly':'-json'),'-json','-cmd','.timeout 1500',dbPath,render],{encoding:'utf8',timeout:4000}).trim();
}
function botDbQ(sql,params=[]){
 // read-only: sqlite3 CLI opens the bot DB with -readonly so mutations are impossible
 return dbQ(botDb,true,sql,params);
}
function botDbOne(sql,params=[]){const out=botDbQ(sql,params);const r=out?JSON.parse(out):[];return r[0]||{}}
function dbWrite(sql,params=[]){
 // write access for admin actions (queue cancel) — mirrors bot's own queries exactly
 return dbQ(botDb,false,sql,params);
}
let serviceCache={at:0,map:{}};
function liveServices(){if(Date.now()-serviceCache.at<10000)return serviceCache.map;const units=['intraservice-intake-bot.service','intraservice-mail-watcher.service','intraservice-shadow-analyzer.service','intraservice-command-analyzer.service','intraservice-bot.service'];try{const out=execFileSync('systemctl',['--user','show',...units,'-p','Id','-p','ActiveState','-p','SubState','--no-pager'],{encoding:'utf8',timeout:5000}),map={};for(const block of out.trim().split(/\n\s*\n/u)){const row=Object.fromEntries(block.split('\n').map(x=>x.split('=',2)));if(row.Id)map[row.Id]={active:row.ActiveState==='active'&&row.SubState==='running',state:`${row.ActiveState||'unknown'}/${row.SubState||'unknown'}`}}serviceCache={at:Date.now(),map};return map}catch{return serviceCache.map}}
function realMetrics(){
 const now=new Date(),today=now.toISOString().slice(0,10),sod=today+'T00:00:00Z',eod=new Date(today+'T23:59:59Z').toISOString(),apiSince=new Date(now.getTime()-24*60*60*1000).toISOString();
 const agg=botDbOne(`
  SELECT
   (SELECT COUNT(*) FROM audit_log WHERE created_at>=? AND created_at<?) AS ops,
   (SELECT ROUND(AVG(duration_ms)) FROM audit_log WHERE source='official_api' AND action='api_primary_read' AND result='ok' AND duration_ms>0 AND created_at>=?) AS api_lat,
   (SELECT COUNT(*) FROM audit_log WHERE source='official_api' AND action='api_primary_read' AND result='ok' AND duration_ms>0 AND created_at>=?) AS api_samples,
   (SELECT COUNT(*) FROM intake_messages WHERE status IN ('needs_clarification','preview')) AS attn,
   (SELECT COUNT(*) FROM intake_messages WHERE status='preview') AS tg,
   (SELECT COUNT(*) FROM shadow_analyses WHERE status='pending')+(SELECT COUNT(*) FROM command_analyses WHERE status='pending') AS ai,
   (SELECT COUNT(*) FROM audit_log WHERE source='official_api' AND action='api_primary_read' AND result='ok' AND created_at>=?) AS api_ok,
   (SELECT COUNT(*) FROM audit_log WHERE source='playwright' AND created_at>=?) AS pw,
   (SELECT COUNT(*) FROM audit_log WHERE source='hybrid' AND created_at>=?) AS hybrid,
   (SELECT COUNT(*) FROM audit_log WHERE source='notebook' AND created_at>=?) AS nb,
   (SELECT COUNT(*) FROM audit_log WHERE action='assign_mail_ticket' AND created_at>=?) AS mail_day,
   (SELECT COUNT(*) FROM audit_log WHERE action='assign_mail_ticket') AS mail_total,
   (SELECT COUNT(*) FROM audit_log WHERE action='create_ticket' AND tg_user_id<>'' AND created_at>=?) AS ctg_day,
   (SELECT COUNT(*) FROM audit_log WHERE action='create_ticket' AND tg_user_id<>'') AS ctg_total,
   (SELECT COUNT(*) FROM audit_log WHERE action='create_ticket' AND (tg_user_id IS NULL OR tg_user_id='') AND created_at>=?) AS cman_day,
   (SELECT COUNT(*) FROM audit_log WHERE action='create_ticket' AND (tg_user_id IS NULL OR tg_user_id='')) AS cman_total
 `,[sod,eod,apiSince,apiSince,apiSince,sod,sod,sod,sod,sod,sod]);
 const mk=n=>Number(n)||0;
 const total=mk(agg.ops);
 const chart={api:mk(agg.api_ok),web:mk(agg.pw)+mk(agg.hybrid),notebook:mk(agg.nb),other:Math.max(0,total-(mk(agg.api_ok)+mk(agg.pw)+mk(agg.hybrid)+mk(agg.nb)))};
 // real mail queue: unique, unassigned, fresh (last 24h) mail tickets from mail_watcher db
 let mailQueue=0;try{const mo=dbQ(mailDb,true,"SELECT COUNT(DISTINCT task_id) c FROM deliveries WHERE status='Открыта' AND sent_at>=datetime('now','-1 day')");mailQueue=Number((JSON.parse(mo)[0]||{}).c)||0}catch(e){/* mail db may be absent */mailQueue=0}
 // mail watcher liveness: any delivery written in the last hour means the watcher is alive
 let mailActive=0;try{const ma=dbQ(mailDb,true,"SELECT COUNT(*) c FROM deliveries WHERE sent_at>=datetime('now','-1 hour')");mailActive=Number((JSON.parse(ma)[0]||{}).c)||0}catch(e){mailActive=0}
 const queueTotal=mk(agg.tg)+mk(agg.ai)+mailQueue;
 const apiLat=Number(agg.api_lat)||0;
 const needAttn=mk(agg.attn),opsToday=total;
 const events=botDbQ("SELECT action,source,result,created_at FROM audit_log ORDER BY id DESC LIMIT 6");
 const eventList=events?JSON.parse(events):[];
 const serviceMap=liveServices(),svc=(unit,name,sub)=>{const row=serviceMap[unit],active=Boolean(row?.active);return{name,sub,status:active?'ok':'warn',latency:active?'active':(row?.state||'недоступен')}};
 return {
  uptime:Math.floor(process.uptime()),
  operationsToday:opsToday,
  avgApiMs:apiLat,
  apiSamples:mk(agg.api_samples),
  activeQueue:queueTotal,
  needsAttention:needAttn,
  queue:{telegram:mk(agg.tg),mail:mailQueue,ai:mk(agg.ai),total:queueTotal},
  created:{
   today:{tg:mk(agg.ctg_day),mail:mk(agg.mail_day),manual:mk(agg.cman_day)},
   total:{tg:mk(agg.ctg_total),mail:mk(agg.mail_total),manual:mk(agg.cman_total)}
  },
  chart,
  services:[
   {name:'Official API',sub:'Основной транспорт · audit_log',status:mk(agg.api_ok)>0?'ok':'idle',latency:apiLat?apiLat+' мс':'нет операций'},
   svc('intraservice-intake-bot.service','Telegram intake','Приём и управление заявками'),
   svc('intraservice-mail-watcher.service','Mail watcher','Почтовые заявки'),
   (()=>{const a=serviceMap['intraservice-shadow-analyzer.service']?.active,b=serviceMap['intraservice-command-analyzer.service']?.active;return{name:'AI analyzers',sub:'Shadow + command',status:a&&b?'ok':'warn',latency:a&&b?'active':'проверь сервисы'}})(),
   svc('intraservice-bot.service','Планировщик','Плановые заявки и одобрение'),
   {name:'Playwright',sub:'Аварийный резерв',status:mk(agg.pw)>0?'backup':'idle',latency:mk(agg.pw)>0?mk(agg.pw)+' опер. сегодня':'не использовался'}
  ],
  operations:eventList.map(e=>({icon:labelIcon(e.action),title:labelTitle(e.action),sub:labelSub(e.source,e.result,e.action),time:timeAgo(e.created_at)})),
  log:eventList.map(e=>({icon:labelIcon(e.action),title:labelTitle(e.action),sub:labelSub(e.source,e.result,e.action),time:timeAgo(e.created_at)}))
 };
}
function labelIcon(a){return {close_ticket:'API',create_ticket:'DB',assign_mail_ticket:'MAIL',notebook_edit:'NB',pc_claim:'PC',template_use:'TPL',auto_close_ticket:'API','default':'EV'}[a]||'EV'}
function labelTitle(a){return {close_ticket:'Операция закрыта',create_ticket:'Создана заявка',assign_mail_ticket:'Почтовая заявка назначена',notebook_edit:'Запись в блокноте',pc_claim:'Выдан номер ПК',template_use:'Использован шаблон',auto_close_ticket:'Авто-закрытие','default':'Событие'}[a]||'Событие'}
function labelSub(source,result,action){return `${String(source||'')} · ${String(result||'')} · ${action}`}
function timeAgo(iso){if(!iso)return'—';const diff=Date.now()-new Date(iso).getTime();if(diff<60000)return'только что';if(diff<3600000)return Math.floor(diff/60000)+' мин';if(diff<86400000)return Math.floor(diff/3600000)+' ч';return Math.floor(diff/86400000)+' дн'}
function maskSecret(v){if(!v)return null;const s=String(v);return s.length>=8?`${s.slice(0,3)}…${s.slice(-3)} (${s.length} симв.)`:`●●●● (${s.length} симв.)`}
async function readFileSafe(file){try{return await fs.readFile(file,'utf8')}catch(e){return null}}
async function fileExists(p){try{await fs.access(p);return true}catch(e){return false}}
async function readBotConfig(){
 const out={config:null,secrets:{},people:[],errors:[]};
 try{out.config=JSON.parse(await fs.readFile(botConfigFile,'utf8'))}catch(e){out.errors.push(`config.json: ${e.message}`)}
 const envText=await readFileSafe(botEnvFile);
 if(envText){
  const env={};for(const line of envText.split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(m)env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}
  out.secrets={
   intraservice_address:out.config&&out.config.base_url||'',
   intraservice_login:env.INTRASERVICE_LOGIN?String(env.INTRASERVICE_LOGIN):'',
   intraservice_password:{set:Boolean(env.INTRASERVICE_PASSWORD)},
   telegram_token:{set:Boolean(env.TELEGRAM_BOT_TOKEN)},
   telegram_chat_id:env.TELEGRAM_CHAT_ID||'',
   env_set:Boolean(envText.trim())
  };
 } else out.secrets={intraservice_address:'',intraservice_login:'',intraservice_password:{set:false},telegram_token:{set:false},telegram_chat_id:'',env_set:false};
 const parser=await readFileSafe(botParserFile);
 if(parser){
  const lines=parser.split('\n');
  const out2=[];
  for(const line of lines){
   if(line.includes("tg:'")||line.includes('tg:')){
    const nm=line.match(/name:'([^']+)'/),tg=line.match(/\btg:'([^']+)'/),intra=line.match(/\bintra:'([^']+)'/);
    if(nm&&tg)out2.push({name:nm[1],tg:tg[1],intra:intra?intra[1]:''});
   }
  }
  out.people=out2;
 }
 try{out.db={intake:await fileExists(botDb),mail:await fileExists(mailDb)}}catch(e){}
 return out;
}

const send=(res,status,body,type='text/html; charset=utf-8',extra={})=>{res.writeHead(status,{...baseHeaders,'Content-Type':type,...extra});res.end(body)};
const redirect=(res,location,extra={})=>{res.writeHead(303,{...baseHeaders,Location:location,...extra});res.end()};
const cookie=(name,value,{maxAge=8*60*60,secure=false,httpOnly=true}={})=>`${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Strict${httpOnly?'; HttpOnly':''}${secure?'; Secure':''}`;
const clearCookie=(name,secure=false)=>cookie(name,'',{maxAge:0,secure});
const isLoopback=req=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&!req.headers['x-forwarded-for'];
const isSecure=req=>Boolean(req.socket.encrypted)||(process.env.PANEL_TRUST_PROXY==='1'&&String(req.headers['x-forwarded-proto']).toLowerCase()==='https');
const maySubmitSecret=req=>isSecure(req)||isLoopback(req)||process.env.PANEL_ALLOW_INSECURE_AUTH==='1';
const getSession=req=>sessions.get(parseCookies(req.headers.cookie).panel_session);
const limiterKey=(req,username)=>`${req.socket.remoteAddress||'unknown'}:${String(username).toLowerCase()}`;

async function readForm(req){
 if(!String(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded'))throw Object.assign(new Error('Unsupported content type'),{status:415});
 let size=0,body='';for await(const chunk of req){size+=chunk.length;if(size>16*1024)throw Object.assign(new Error('Request too large'),{status:413});body+=chunk.toString('utf8')}
 return Object.fromEntries(new URLSearchParams(body));
}
async function readJson(req){
 if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(new Error('Unsupported content type'),{status:415});
 let size=0,body='';for await(const chunk of req){size+=chunk.length;if(size>64*1024)throw Object.assign(new Error('Request too large'),{status:413});body+=chunk.toString('utf8')}
 try{return JSON.parse(body||'{}')}catch{throw Object.assign(new Error('Некорректный JSON'),{status:400})}
}
function cleanPreviews(){const now=Date.now();for(const [token,row] of configPreviews)if(row.expiresAt<=now)configPreviews.delete(token)}
function restartConfiguredServices(){const units=['intraservice-intake-bot.service','intraservice-mail-watcher.service','intraservice-bot.service'];execFileSync('systemctl',['--user','restart',...units],{encoding:'utf8',timeout:60000});return units.map(unit=>({unit,active:execFileSync('systemctl',['--user','is-active',unit],{encoding:'utf8',timeout:10000}).trim()==='active'}))}
async function settingsAudit(session,changed){const file=path.join(project,'data','settings-audit.log'),line=JSON.stringify({at:new Date().toISOString(),actor:session.username,changed})+'\n';await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});await fs.appendFile(file,line,{encoding:'utf8',mode:0o600});await fs.chmod(file,0o600)}
function issueLoginToken(res,secure){
 const token=randomToken();loginTokens.set(token,Date.now()+10*60*1000);
 for(const [key,expires] of loginTokens)if(expires<Date.now())loginTokens.delete(key);
 if(loginTokens.size>2048)loginTokens.delete(loginTokens.keys().next().value);
 res.setHeader('Set-Cookie',cookie('panel_login_csrf',token,{maxAge:600,secure}));return token;
}
function consumeLoginToken(req,form){const token=parseCookies(req.headers.cookie).panel_login_csrf,expires=token&&loginTokens.get(token);loginTokens.delete(token);return Boolean(token&&form._csrf===token&&expires>Date.now())}
function renderLogin(req,res,{error='',retryAfter=0,notice=''}={}){const secure=maySubmitSecret(req),token=issueLoginToken(res,isSecure(req));send(res,secure?200:426,account?renderAuthPage({mode:'login',csrf:token,error,retryAfter,notice,secure}):renderSetupRequired())}
function requireSession(req,res){const session=getSession(req);if(!session){redirect(res,'/login');return null}return session}

const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/healthz'&&req.method==='GET')return send(res,200,JSON.stringify({ok:true,mode:'authenticated-live',authConfigured:Boolean(account)}),'application/json; charset=utf-8');
  if(url.pathname==='/api/metrics'&&req.method==='GET'){
    const session=getSession(req);if(!session)return send(res,401,JSON.stringify({error:'Unauthorized'}),'application/json; charset=utf-8');
    let m;
    try{m=realMetrics()}catch(e){m={ok:false,error:String(e.message)}}
    return send(res,m.ok===false?502:200,JSON.stringify({ok:true,...m}),'application/json; charset=utf-8');
  }
  if(url.pathname==='/login'&&req.method==='GET'){
   const session=getSession(req);if(session)return redirect(res,session.mustChange?'/change-password':'/');
   return renderLogin(req,res);
  }
  if(url.pathname==='/auth/login'&&req.method==='POST'){
   if(!account)return send(res,503,renderSetupRequired());
   if(!maySubmitSecret(req))return renderLogin(req,res,{error:'Отправка пароля по открытому HTTP запрещена.'});
   const form=await readForm(req);if(!consumeLoginToken(req,form))return renderLogin(req,res,{error:'Форма устарела. Повторите вход.'});
   const key=limiterKey(req,form.username),state=limiter.status(key);if(!state.allowed)return renderLogin(req,res,{retryAfter:state.retryAfter,error:'Слишком много попыток входа.'});
   const validUser=String(form.username||'')===account.username;
   const validPassword=await verifyPassword(String(form.password||''),account.password);
   if(!validUser||!validPassword){const next=limiter.failure(key);await new Promise(resolve=>setTimeout(resolve,250));return renderLogin(req,res,{error:'Неверный логин или пароль.',retryAfter:next.allowed?0:next.retryAfter})}
   limiter.success(key);const session=sessions.create(account.username,account.mustChange);return redirect(res,account.mustChange?'/change-password':'/',{'Set-Cookie':[cookie('panel_session',session.id,{secure:isSecure(req)}),clearCookie('panel_login_csrf',isSecure(req))]});
  }
  if(url.pathname==='/change-password'&&req.method==='GET'){
   const session=requireSession(req,res);if(!session)return;if(!session.mustChange)return redirect(res,'/');
   return send(res,200,renderAuthPage({mode:'change',csrf:session.csrf,secure:maySubmitSecret(req)}));
  }
  if(url.pathname==='/auth/change-password'&&req.method==='POST'){
   const session=requireSession(req,res);if(!session)return;if(!session.mustChange)return redirect(res,'/');
   if(!maySubmitSecret(req))return send(res,426,renderAuthPage({mode:'change',csrf:session.csrf,secure:false,error:'Смена пароля по открытому HTTP запрещена.'}));
   const form=await readForm(req);if(form._csrf!==session.csrf)return send(res,403,renderAuthPage({mode:'change',csrf:session.csrf,secure:true,error:'Проверка CSRF не пройдена. Обновите страницу.'}));
   const current=String(form.currentPassword||''),next=String(form.newPassword||''),confirm=String(form.confirmPassword||'');
   if(!await verifyPassword(current,account.password))return send(res,400,renderAuthPage({mode:'change',csrf:session.csrf,secure:true,error:'Текущий пароль указан неверно.'}));
   if(next!==confirm)return send(res,400,renderAuthPage({mode:'change',csrf:session.csrf,secure:true,error:'Новые пароли не совпадают.'}));
   const policy=passwordPolicy(next,account.username);if(policy.length)return send(res,400,renderAuthPage({mode:'change',csrf:session.csrf,secure:true,error:policy.join(' ')}));
   if(await verifyPassword(next,account.password))return send(res,400,renderAuthPage({mode:'change',csrf:session.csrf,secure:true,error:'Новый пароль должен отличаться от начального.'}));
   const now=new Date().toISOString();account={...account,password:await hashPassword(next),mustChange:false,updatedAt:now,passwordChangedAt:now};await saveAccount(authFile,account);
   sessions.destroyAll();const fresh=sessions.create(account.username,false);return redirect(res,'/',{'Set-Cookie':cookie('panel_session',fresh.id,{secure:isSecure(req)})});
  }
  if(url.pathname==='/auth/logout'&&req.method==='POST'){
   const session=requireSession(req,res);if(!session)return;const form=await readForm(req);if(form._csrf!==session.csrf)return send(res,403,'CSRF validation failed','text/plain; charset=utf-8');sessions.destroy(session.id);return redirect(res,'/login',{'Set-Cookie':clearCookie('panel_session',isSecure(req))});
  }
  if(url.pathname==='/api/config'&&req.method==='GET'){
    const session=getSession(req);if(!session)return send(res,401,JSON.stringify({error:'Unauthorized'}),'application/json; charset=utf-8');
    let data;try{data=await configStore.read()}catch(e){return send(res,502,JSON.stringify({ok:false,error:String(e.message)}),'application/json; charset=utf-8')}
    const {_raw,...safe}=data;safe.db={intake:await fileExists(botDb),mail:await fileExists(mailDb)};
    return send(res,200,JSON.stringify({ok:true,writeEnabled:configWriteEnabled,...safe}),'application/json; charset=utf-8');
  }
  if(url.pathname==='/api/config/preview'&&req.method==='POST'){
    const session=getSession(req);if(!session)return send(res,401,JSON.stringify({error:'Unauthorized'}),'application/json; charset=utf-8');
    if(!configWriteEnabled)return send(res,403,JSON.stringify({ok:false,error:'Запись настроек отключена администратором'}),'application/json; charset=utf-8');
    if(!maySubmitSecret(req))return send(res,426,JSON.stringify({ok:false,error:'Настройки можно менять только через HTTPS'}),'application/json; charset=utf-8');
    const body=await readJson(req);if(body._csrf!==session.csrf)return send(res,403,JSON.stringify({ok:false,error:'CSRF failed'}),'application/json; charset=utf-8');
    let prepared;try{prepared=await configStore.preview(body)}catch(e){return send(res,Number(e.status)||400,JSON.stringify({ok:false,error:String(e.message)}),'application/json; charset=utf-8')}
    cleanPreviews();const token=randomToken(),expiresAt=Date.now()+10*60*1000;configPreviews.set(token,{sessionId:session.id,prepared,expiresAt});
    return send(res,200,JSON.stringify({ok:true,previewToken:token,summary:prepared.summary,expiresAt:new Date(expiresAt).toISOString()}),'application/json; charset=utf-8');
  }
  if(url.pathname==='/api/config/apply'&&req.method==='POST'){
    const session=getSession(req);if(!session)return send(res,401,JSON.stringify({error:'Unauthorized'}),'application/json; charset=utf-8');
    if(!configWriteEnabled)return send(res,403,JSON.stringify({ok:false,error:'Запись настроек отключена администратором'}),'application/json; charset=utf-8');
    if(!maySubmitSecret(req))return send(res,426,JSON.stringify({ok:false,error:'Настройки можно менять только через HTTPS'}),'application/json; charset=utf-8');
    const body=await readJson(req);if(body._csrf!==session.csrf)return send(res,403,JSON.stringify({ok:false,error:'CSRF failed'}),'application/json; charset=utf-8');cleanPreviews();
    const key=String(body.previewToken||''),pending=configPreviews.get(key);if(!pending||pending.sessionId!==session.id)return send(res,409,JSON.stringify({ok:false,error:'Предпросмотр истёк или принадлежит другой сессии'}),'application/json; charset=utf-8');configPreviews.delete(key);
    let applied;try{applied=await configStore.apply(pending.prepared)}catch(e){return send(res,Number(e.status)||500,JSON.stringify({ok:false,error:String(e.message)}),'application/json; charset=utf-8')}
    let services=configRestartEnabled?[]:[{unit:'restart-disabled',active:true}];if(configRestartEnabled)try{services=restartConfiguredServices()}catch{services=[{unit:'restart',active:false,error:'Не удалось перезапустить сервисы'}]}
    await settingsAudit(session,applied.changed).catch(()=>{});
    return send(res,200,JSON.stringify({ok:true,changed:applied.changed,revision:applied.revision,services}),'application/json; charset=utf-8');
  }
  if(url.pathname==='/api/queue'&&req.method==='GET'){
    const session=getSession(req);if(!session)return send(res,401,JSON.stringify({error:'Unauthorized'}),'application/json; charset=utf-8');
    let rows;
    try{const out=botDbQ("SELECT id,tg_user_id,chat_id,status,substr(text,1,120) text,created_at FROM intake_messages WHERE status IN ('preview','needs_clarification') ORDER BY id");rows=out?JSON.parse(out):[]}
    catch(e){return send(res,502,JSON.stringify({ok:false,error:String(e.message)}),'application/json; charset=utf-8')}
    return send(res,200,JSON.stringify({ok:true,items:rows}),'application/json; charset=utf-8');
  }
  if(url.pathname==='/api/queue/cancel'&&req.method==='POST'){
    const session=getSession(req);if(!session)return send(res,401,JSON.stringify({error:'Unauthorized'}),'application/json; charset=utf-8');
    const form=await readForm(req);if(form._csrf!==session.csrf)return send(res,403,JSON.stringify({error:'CSRF failed'}),'application/json; charset=utf-8');
    const id=Number(form.id);if(!Number.isInteger(id)||id<=0)return send(res,400,JSON.stringify({error:'bad id'}),'application/json; charset=utf-8');
    try{
      const row=JSON.parse(botDbQ("SELECT id,tg_update_id,status FROM intake_messages WHERE id=?",[id]));
      const r=row[0];if(!r)return send(res,404,JSON.stringify({ok:false,error:'not found'}),'application/json; charset=utf-8');
      if(!['preview','needs_clarification'].includes(r.status))return send(res,409,JSON.stringify({ok:false,error:`Нельзя отменить: статус ${r.status}`,status:r.status}),'application/json; charset=utf-8');
      dbWrite("UPDATE intake_messages SET status='cancelled' WHERE id=? AND status IN ('preview','needs_clarification')",[id]);
      if(r.tg_update_id)dbWrite("UPDATE shadow_analyses SET outcome='cancelled' WHERE tg_update_id=?",[r.tg_update_id]);
      return send(res,200,JSON.stringify({ok:true,id}),'application/json; charset=utf-8');
    }catch(e){return send(res,502,JSON.stringify({ok:false,error:String(e.message)}),'application/json; charset=utf-8')}
  }
  if((url.pathname==='/'||url.pathname==='/index.html')&&req.method==='GET'){
   const session=requireSession(req,res);if(!session)return;if(session.mustChange)return redirect(res,'/change-password');
   let html=await fs.readFile(dashboardFile,'utf8');html=html.replaceAll('{{CSRF_TOKEN}}',session.csrf);return send(res,200,html);
  }
  return send(res,404,'Not found','text/plain; charset=utf-8');
 }catch(error){const status=Number(error.status)||500;if(status>=500)console.error('request failed',{method:req.method,url:req.url,error:error.message});return send(res,status,status>=500?'Internal server error':error.message,'text/plain; charset=utf-8')}
});
server.listen(port,host,()=>console.log(`admin panel listening on http://${host}:${port}; auth=${account?'configured':'setup-required'}`));
let stopping=false;const stop=()=>{if(stopping)return;stopping=true;server.close(()=>process.exit(0));setTimeout(()=>server.closeAllConnections(),1000).unref()};process.on('SIGTERM',stop);process.on('SIGINT',stop);
