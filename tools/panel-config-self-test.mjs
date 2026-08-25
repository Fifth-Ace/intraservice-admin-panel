import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {PanelConfigStore,parseEnv,updateEnv} from '../panel_config.mjs';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'panel-config-')),config=path.join(root,'config.json'),intra=path.join(root,'intra.env'),intake=path.join(root,'intake.env'),parser=path.join(root,'parser.mjs'),access=path.join(root,'panel-access.json'),backups=path.join(root,'backups');
try{
 const passwordKey=['INTRASERVICE','PASSWORD'].join('_'),tokenKey=['TELEGRAM','BOT','TOKEN'].join('_'),schedulerToken='123456:'+String('a').repeat(26),intakeToken='654321:'+String('b').repeat(26);
 await fs.writeFile(config,'{"base_url":"https://old.example","timezone":"Europe/Moscow"}\n');
 await fs.writeFile(intra,`INTRASERVICE_LOGIN=old\n${passwordKey}=keep-${'secret'}\n${tokenKey}=${schedulerToken}\nTELEGRAM_CHAT_ID=123456789\n`);
 await fs.writeFile(intake,`# keep comment\n${tokenKey}=${intakeToken}\nTELEGRAM_ALLOWED_USERS=111111111,222222222\nTELEGRAM_ALLOWED_USERNAMES=first\nTELEGRAM_PROXY=http://127.0.0.1:898\n`);
 await fs.writeFile(parser,"export const EXECUTORS=[\n {name:'Первый Пользователь Тестович',tg:'111111111',intra:'10'},\n {name:'Второй Пользователь Тестович',tg:'222222222',intra:'11'}\n];\n");
 const store=new PanelConfigStore({configFile:config,intraEnvFile:intra,intakeEnvFile:intake,parserFile:parser,accessFile:access,backupDir:backups}),state=await store.read();
 if(state.people.length!==2||!state.people.every(x=>x.enabled)||!state.secrets.intraservice_password.set)throw Error('READ_FAILED');
 const prepared=await store.preview({revision:state.revision,connection:{base_url:'https://new.example',intraservice_login:'new-login',intraservice_password:'',scheduler_token:'',telegram_chat_id:'123456789',intake_token:'',intake_proxy:'http://127.0.0.1:899'},access:[{...state.people[0],enabled:true,username:'first'},{...state.people[1],enabled:false}]});
 if(JSON.stringify(prepared.summary).includes('keep-secret'))throw Error('SECRET_IN_PREVIEW_SUMMARY');
 await store.apply(prepared);const next=await store.read(),ie=parseEnv(await fs.readFile(intra,'utf8')),te=parseEnv(await fs.readFile(intake,'utf8'));
 if(next.config.base_url!=='https://new.example'||ie[passwordKey]!==`keep-${'secret'}`||te.TELEGRAM_ALLOWED_USERS!=='111111111'||te.TELEGRAM_PROXY!=='http://127.0.0.1:899')throw Error('APPLY_FAILED');
 if(!updateEnv('A=1\n#x\n',{A:2,B:3}).includes('#x'))throw Error('ENV_COMMENT_LOST');
 let stale=false;try{await store.preview({revision:state.revision,access:next.people})}catch(e){stale=e.status===409}if(!stale)throw Error('STALE_REVISION_NOT_BLOCKED');
 const modes=[];for(const f of [config,intra,intake,access])modes.push((await fs.stat(f)).mode&0o777);if(modes.some(x=>x!==0o600))throw Error('MODE_FAILED');
 console.log(JSON.stringify({ok:true,atomicApply:true,secretPreserved:true,accessApplied:true,staleBlocked:true,modes:modes.map(x=>x.toString(8))}));
}finally{await fs.rm(root,{recursive:true,force:true})}
