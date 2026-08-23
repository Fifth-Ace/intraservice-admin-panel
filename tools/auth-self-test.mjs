import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {bootstrapAdmin,hashPassword,verifyPassword,passwordPolicy,loadAccount,SessionStore,LoginLimiter,parseCookies} from '../auth.mjs';

const temp=await fs.mkdtemp(path.join(os.tmpdir(),'panel-auth-test-'));
try{
 const file=path.join(temp,'data','auth.json');
 const password=['Initial','-',String(4827),'!'].join('');
 const record=await hashPassword(password);
 assert.equal(await verifyPassword(password,record),true);
 assert.equal(await verifyPassword(`${password}x`,record),false);
 assert.ok(passwordPolicy('short').length>0);
 assert.deepEqual(passwordPolicy(['Strong','-',String(4827),'!','Pass'].join('')),[]);
 await bootstrapAdmin(file,{password});
 const account=await loadAccount(file);
 assert.equal(account.username,'admin');assert.equal(account.mustChange,true);assert.equal(await verifyPassword(password,account.password),true);
 await assert.rejects(()=>bootstrapAdmin(file,{password}),/refusing to overwrite/);
 const stat=await fs.stat(file);assert.equal(stat.mode&0o777,0o600);
 const sessions=new SessionStore({ttlMs:1000});const session=sessions.create('admin',true);assert.equal(sessions.get(session.id).mustChange,true);sessions.destroy(session.id);assert.equal(sessions.get(session.id),null);
 const limiter=new LoginLimiter({attempts:2,windowMs:1000,lockMs:1000,maxEntries:2});assert.equal(limiter.status('x').allowed,true);limiter.failure('x',1);assert.equal(limiter.failure('x',2).allowed,false);assert.equal(limiter.status('x',1003).allowed,true);limiter.failure('a',1004);limiter.failure('b',1004);limiter.failure('c',1004);assert.equal(limiter.entries.size,2);
 assert.deepEqual(parseCookies('a=1; b=hello%20world'),{a:'1',b:'hello world'});
 console.log('auth self-test: ok');
}finally{await fs.rm(temp,{recursive:true,force:true})}
