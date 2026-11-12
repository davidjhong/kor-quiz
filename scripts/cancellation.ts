import {AsyncLocalStorage} from 'node:async_hooks';
import {spawn,type ChildProcess} from 'node:child_process';

export class ProductionCancelled extends Error {constructor(){super('Production cancelled; resumable state and uncertain reservations preserved');}}
type Context={signal:AbortSignal;workers:Set<Promise<void>>};
const contexts=new AsyncLocalStorage<Context>();
export const checkCancellation=()=>{if(contexts.getStore()?.signal.aborted)throw new ProductionCancelled();};
export const cancellationRequested=()=>!!contexts.getStore()?.signal.aborted;
export const productionSignal=()=>contexts.getStore()?.signal;
/** Register only workers created by this run. Wait for exit before releasing job locks. */
export const ownWorker=(child:ChildProcess)=>{
  const context=contexts.getStore();if(!context)return;
  let finish!:()=>void;const closed=new Promise<void>(resolve=>{finish=resolve;});context.workers.add(closed);
  const stop=()=>{
    if(child.exitCode!==null||child.signalCode||!child.pid)return;
    if(process.platform==='win32'){
      // The PID comes directly from our newly spawned ChildProcess, never job/user text.
      const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,shell:false,stdio:'ignore'});
      killer.on('error',()=>child.kill());
    }else child.kill('SIGTERM');
  };
  child.once('close',()=>{context.signal.removeEventListener('abort',stop);context.workers.delete(closed);finish();});
  child.once('error',()=>{context.workers.delete(closed);finish();});
  context.signal.addEventListener('abort',stop,{once:true});if(context.signal.aborted)stop();
};
export const withCancellation=async<T>(signal:AbortSignal,work:()=>Promise<T>)=>{
  const context:Context={signal,workers:new Set()};
  try{return await contexts.run(context,work);}finally{await Promise.allSettled([...context.workers]);}
};
export const withSignalCancellation=async<T>(work:()=>Promise<T>)=>{
  const controller=new AbortController();const stop=()=>{if(!controller.signal.aborted){console.error('Stopping after the current provider response; terminating owned local workers.');controller.abort();}};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try{return await withCancellation(controller.signal,work);}finally{process.off('SIGINT',stop);process.off('SIGTERM',stop);}
};
