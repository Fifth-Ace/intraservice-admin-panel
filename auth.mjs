import fs from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {randomBytes, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';

const scrypt=promisify(scryptCallback);
const PARAMS=Object.freeze({N:32768,r:8,p:1,keylen:32,maxmem:64*1024*1024});

export async function hashPassword(password){
 const salt=randomBytes(16);
 const derived=await scrypt(password,salt,PARAMS.keylen,{N:PARAMS.N,r:PARAMS.r,p:PARAMS.p,maxmem:PARAMS.maxmem});
 return{algorithm:'scrypt',salt:salt.toString('base64'),hash:Buffer.from(derived).toString('base64'),N:PARAMS.N,r:PARAMS.r,p:PARAMS.p,keylen:PARAMS.keylen};
}

export async function verifyPassword(password,record){
 try{
  if(!record||record.algorithm!=='scrypt')return false;
  const expected=Buffer.from(record.hash,'base64');
  const actual=Buffer.from(await scrypt(password,Buffer.from(record.salt,'base64'),record.keylen,{N:record.N,r:record.r,p:record.p,maxmem:PARAMS.maxmem}));
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
 }catch{return false}
}

export function passwordPolicy(password,username='admin'){
 const errors=[];
 if(password.length<12)errors.push('Минимум 12 символов.');
 if(password.length>128)errors.push('Максимум 128 символов.');
 const groups=[/[a-zа-яё]/u,/[A-ZА-ЯЁ]/u,/\d/u,/[^\p{L}\p{N}\s]/u].filter(rx=>rx.test(password)).length;
 if(groups<3)errors.push('Используйте минимум три группы: строчные, прописные, цифры, специальные символы.');
 if(password.toLowerCase().includes(username.toLowerCase()))errors.push('Пароль не должен содержать логин.');
 return errors;
}

export async function loadAccount(file){
 const data=JSON.parse(await fs.readFile(file,'utf8'));
 if(data.version!==1||typeof data.username!=='string'||!data.password)throw new Error('Invalid auth store');
 return data;
}

export async function saveAccount(file,account){
 await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});
 await fs.chmod(path.dirname(file),0o700);
 const temp=`${file}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
 await fs.writeFile(temp,`${JSON.stringify(account,null,2)}\n`,{mode:0o600,flag:'wx'});
 await fs.rename(temp,file);
 await fs.chmod(file,0o600);
}

export async function bootstrapAdmin(file,{username='admin',password}){
 try{await fs.access(file);throw new Error('Auth store already exists; refusing to overwrite it')}catch(error){if(error.code!=='ENOENT')throw error}
 const now=new Date().toISOString();
 const account={version:1,username,password:await hashPassword(password),mustChange:true,createdAt:now,updatedAt:now,passwordChangedAt:null};
 await saveAccount(file,account);
 return account;
}

export class SessionStore{
 constructor({ttlMs=8*60*60*1000}={}){this.ttlMs=ttlMs;this.sessions=new Map()}
 create(username,mustChange){const id=randomBytes(32).toString('base64url'),now=Date.now(),session={id,username,mustChange,csrf:randomBytes(24).toString('base64url'),createdAt:now,expiresAt:now+this.ttlMs};this.sessions.set(id,session);return session}
 get(id){const session=id&&this.sessions.get(id);if(!session)return null;if(session.expiresAt<=Date.now()){this.sessions.delete(id);return null}return session}
 destroy(id){if(id)this.sessions.delete(id)}
 destroyAll(){this.sessions.clear()}
}

export class LoginLimiter{
 constructor({attempts=5,windowMs=15*60*1000,lockMs=15*60*1000,maxEntries=4096}={}){this.attempts=attempts;this.windowMs=windowMs;this.lockMs=lockMs;this.maxEntries=maxEntries;this.entries=new Map()}
 status(key,now=Date.now()){const e=this.entries.get(key);if(!e)return{allowed:true,retryAfter:0};if(e.lockUntil>now)return{allowed:false,retryAfter:Math.ceil((e.lockUntil-now)/1000)};if(now-e.firstAt>this.windowMs){this.entries.delete(key);return{allowed:true,retryAfter:0}}return{allowed:true,retryAfter:0}}
 failure(key,now=Date.now()){if(!this.entries.has(key)&&this.entries.size>=this.maxEntries)this.entries.delete(this.entries.keys().next().value);let e=this.entries.get(key);if(!e||now-e.firstAt>this.windowMs)e={count:0,firstAt:now,lockUntil:0};e.count+=1;if(e.count>=this.attempts)e.lockUntil=now+this.lockMs;this.entries.set(key,e);return this.status(key,now)}
 success(key){this.entries.delete(key)}
}

export function parseCookies(header=''){
 const result={};for(const part of header.split(';')){const i=part.indexOf('=');if(i<1)continue;const key=part.slice(0,i).trim();try{result[key]=decodeURIComponent(part.slice(i+1).trim())}catch{}}
 return result;
}

export function randomToken(bytes=24){return randomBytes(bytes).toString('base64url')}
