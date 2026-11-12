import {mkdir,open,readFile,rename,unlink} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {hostname,platform} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {checkCancellation} from './cancellation.ts';
const execute=promisify(execFile);
export type LockOwner={version:2;pid:number;machine:string;processStart:string|null;token:string;startedAt:string};
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const owned=(raw:string|null,token:string)=>{try{return !!raw&&JSON.parse(raw).token===token;}catch{return false;}};
let machinePromise:Promise<string>|undefined;
const machineIdentity=()=>machinePromise??=(async()=>{
  let id:string;
  if(process.platform==='win32')id=(await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',"(Get-ItemProperty -LiteralPath 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid).MachineGuid"],{windowsHide:true,timeout:10000})).stdout.trim();
  else if(process.platform==='linux')id=readFileSync('/etc/machine-id','utf8').trim();
  else throw new Error('Verified machine/process identity is unavailable on this platform; do not recover ambiguous locks');
  if(!id)throw new Error('Machine identity unavailable; job lock cannot be safely owned');return digest(`${platform()}:${hostname()}:${id}`);
})();
const processStart=async(pid:number):Promise<string|null>=>{
  if(!Number.isInteger(pid)||pid<1)return null;
  try{if(process.platform==='linux'){const stat=await readFile(`/proc/${pid}/stat`,'utf8');return (await readFile('/proc/sys/kernel/random/boot_id','utf8')).trim()+':'+stat.slice(stat.lastIndexOf(')')+2).split(' ')[19];}
    if(process.platform==='win32'){const value=(await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',`try { [string](Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().Ticks } catch { 'UNKNOWN' }`],{windowsHide:true,timeout:10000})).stdout.trim();return /^\d+$/u.test(value)?value:null;}
  }catch{/* Unknown is deliberately not proof of death. */}return null;
};
let ownIdentity:Promise<Omit<LockOwner,'token'|'startedAt'>>|undefined;
const identity=()=>ownIdentity??=(async()=>({version:2 as const,pid:process.pid,machine:await machineIdentity(),processStart:await processStart(process.pid)}))();
export type OwnerState={state:'active'|'stale'|'unknown';reason:string};
export const classifyLockOwner=async(owner:Partial<LockOwner>,currentMachine:string,
  probe:(pid:number)=>{alive:boolean;unknown?:boolean}=pid=>{try{process.kill(pid,0);return {alive:true};}catch(e){return (e as NodeJS.ErrnoException).code==='ESRCH'?{alive:false}:{alive:false,unknown:true};}},
  start=processStart):Promise<OwnerState>=>{
  if(owner.version!==2||!owner.token||!owner.processStart||owner.machine!==currentMachine||!Number.isInteger(owner.pid)||owner.pid!<1)
    return {state:'unknown',reason:'legacy, incomplete or different-machine owner'};
  const p=probe(owner.pid!);if(p.unknown)return {state:'unknown',reason:'process permissions/identity unavailable'};
  if(!p.alive)return {state:'stale',reason:'same-machine recorded process is definitely absent'};
  const actual=await start(owner.pid!);
  if(actual===owner.processStart)return {state:'active',reason:'matching PID and process-start identity'};
  return {state:'unknown',reason:actual?'PID reused; current process is not the recorded owner':'process-start identity unavailable'};
};
export const acquireJobLock=async(folder:string,_recover=false)=>{
  checkCancellation();await mkdir(folder,{recursive:true});const base=await identity();
  const owner:LockOwner={...base,token:randomUUID(),startedAt:new Date().toISOString()},file=join(folder,'job.lock'),guardFile=join(folder,'lock-recovery.guard');
  const guard=await open(guardFile,'wx').catch(()=>{throw new Error('Job lock acquisition/recovery is already running or ambiguous; inspect lock-recovery.guard without deleting a live guard');});
  try{
    await guard.writeFile(JSON.stringify(owner));
    const raw=await readFile(file,'utf8').catch((e:NodeJS.ErrnoException)=>{if(e.code==='ENOENT')return null;throw e;});
    if(raw){let prior:Partial<LockOwner>={};try{prior=JSON.parse(raw);}catch{/* Unknown owner. */}
      const state=await classifyLockOwner(prior,base.machine);
      if(state.state!=='stale')throw new Error(`Production job is locked (${state.state}: ${state.reason}); --recover-lock cannot override active/ambiguous ownership. Inspect PID/machine/start identity.`);
      if(await readFile(file,'utf8')!==raw)throw new Error('Job lock changed during recovery; no lock removed');
      await rename(file,join(folder,`recovered-lock-${Date.now()}-${owner.token}.json`));
    }
    checkCancellation();const handle=await open(file,'wx');
    await handle.writeFile(JSON.stringify(owner));await handle.sync();
    return async()=>{await handle.close();const saved=await readFile(file,'utf8').catch(()=>null);
      if(owned(saved,owner.token))await unlink(file);};
  }finally{await guard.close();const saved=await readFile(guardFile,'utf8').catch(()=>null);if(owned(saved,owner.token))await unlink(guardFile);}
};
