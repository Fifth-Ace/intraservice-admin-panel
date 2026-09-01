import {writable,type Readable} from 'svelte/store';

export type PollingState<T>={data:T|null;status:'idle'|'loading'|'ready'|'error';error:string|null;updatedAt:number};
export type PollingStore<T>=Readable<PollingState<T>> & {refresh():Promise<void>;destroy():void};

export function createPollingStore<T>(loader:()=>Promise<T>,intervalMs=10000):PollingStore<T>{
  const state=writable<PollingState<T>>({data:null,status:'idle',error:null,updatedAt:0});
  let timer:ReturnType<typeof setTimeout>|null=null,destroyed=false,inFlight:Promise<void>|null=null;
  const schedule=()=>{if(!destroyed){timer=setTimeout(()=>void refresh(),intervalMs)}};
  async function refresh(){
    if(destroyed||inFlight)return inFlight??Promise.resolve();
    if(typeof document!=='undefined'&&document.hidden){schedule();return}
    inFlight=(async()=>{
      state.update(s=>({...s,status:s.data?'ready':'loading',error:null}));
      try{const data=await loader();state.set({data,status:'ready',error:null,updatedAt:Date.now()})}
      catch(error){state.update(s=>({...s,status:'error',error:error instanceof Error?error.message:String(error)}))}
      finally{inFlight=null;schedule()}
    })();
    return inFlight;
  }
  void refresh();
  return {subscribe:state.subscribe,refresh,destroy(){destroyed=true;if(timer)clearTimeout(timer)}};
}
