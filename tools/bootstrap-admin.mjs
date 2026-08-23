import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bootstrapAdmin} from '../auth.mjs';

const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target=process.env.PANEL_AUTH_FILE||path.join(project,'data','auth.json');
const username=process.env.PANEL_ADMIN_USERNAME||'admin';

function readSecret(prompt){
 if(!process.stdin.isTTY)return new Promise((resolve,reject)=>{let value='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>value+=chunk);process.stdin.on('end',()=>resolve(value.replace(/[\r\n]+$/,'')));process.stdin.on('error',reject)});
 return new Promise((resolve,reject)=>{
  let value='';const input=process.stdin;process.stdout.write(prompt);input.setRawMode(true);input.resume();input.setEncoding('utf8');
  const finish=(error,result)=>{input.off('data',onData);input.setRawMode(false);input.pause();process.stdout.write('\n');error?reject(error):resolve(result)};
  const onData=chunk=>{for(const char of chunk){if(char==='\u0003')return finish(new Error('Cancelled'));if(char==='\r'||char==='\n')return finish(null,value);if(char==='\u007f'||char==='\b'){if(value){value=value.slice(0,-1);process.stdout.write('\b \b')}continue}if(char>=' '){value+=char;process.stdout.write('*')}}};input.on('data',onData);
 });
}

const password=await readSecret(`Начальный пароль для ${username}: `);
if(!password)throw new Error('Password cannot be empty');
await bootstrapAdmin(target,{username,password});
console.log(`Администратор ${username} создан. Обязательная смена пароля включена.`);
