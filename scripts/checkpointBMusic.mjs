/** Local-only A/B audition. No change to production presets or prepared TTS. */
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {runRemotion} from './remotionCommand.ts';
import {getNarratedTimeline} from '../src/narrationTiming.ts';
import {runtimeQuiz} from '../src/production.ts';
const root=resolve('.'),folder=join(root,'out/checkpoint-b'),json=async p=>JSON.parse(await readFile(p,'utf8'));
const job=await json('data/production-jobs/restaurant-fresh-02/job.json'),cert=await json(job.renderCertificate),p=await json(cert.propsFile),t=getNarratedTimeline(p.narration,runtimeQuiz(p.quiz));
const duration=t.questions[0].end/30,spans=t.audio.filter(a=>a.end<=t.questions[0].end);
const clamp=x=>`min(1,max(0,${x}))`,f='(t*30)',env=(s,e)=>`min(${clamp(`(${f}-${s}+9)/9`)},${clamp(`(${e}+18-${f})/18`)})`,max=xs=>xs.reduce((a,b)=>`max(${a},${b})`,'0');
const thinking=max(t.questions.filter(q=>q.countdownStart<duration*30).map(q=>env(q.countdownStart,q.revealStart))),duck=max(spans.map(a=>env(a.start,a.end)));
const base=`(.45+(.30-.45)*${thinking})`,gain=`(${base}+(.20-${base})*${duck})*1.25*min(${clamp(`${f}/30`)},${clamp(`(${duration*30-1}-${f})/30`)})`;
const fade=`volume='min(1,max(0,t/0.15))*min(1,max(0,(${duration}-t)/0.4))':eval=frame`;
await runRemotion(['ffmpeg','-y','-v','error','-i',join(root,'public',p.music.file),'-af',`atrim=duration=${duration},asetpts=PTS-STARTPTS,volume='${gain}':eval=frame,${fade}`,'-ar','48000','-ac','2','-c:a','pcm_s16le',join(folder,'music-a-raw.wav')],true,60000);
const inputs=spans.flatMap(a=>['-i',join(root,'public',a.file)]),filters=[...spans.map((a,i)=>`[${i}:a]adelay=${a.start/30*1000}:all=1[s${i}]`),`${spans.map((_,i)=>`[s${i}]`).join('')}amix=inputs=${spans.length}:normalize=0,${fade}[mix]`];
await runRemotion(['ffmpeg','-y','-v','error',...inputs,'-filter_complex',filters.join(';'),'-map','[mix]','-t',String(duration),'-ar','48000','-ac','2','-c:a','pcm_s16le',join(folder,'speech-a-raw.wav')],true,60000);
await runRemotion(['ffmpeg','-y','-v','error','-i','out/checkpoint-a/mix-preview-audio-final.mp4','-ar','48000','-ac','2','-c:a','pcm_s16le',join(folder,'actual-a-decoded.wav')],true,60000);
await writeFile(join(folder,'mix-timeline.json'),JSON.stringify({duration,spans,countdown:{start:t.questions[0].countdownStart/30,end:t.questions[0].revealStart/30},window:{start:7.8,duration:13.4},candidateMusicMultiplier:10**(3/20),narrationGain:1,productionUnchanged:true,providerCalls:0},null,2));
console.log('Decoded actual A and reconstructed exact pre-master music/speech stems.');
