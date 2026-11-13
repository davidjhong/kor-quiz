import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {runRemotion} from './remotionCommand.ts';
import {getNarratedTimeline} from '../src/narrationTiming.ts';
import {runtimeQuiz} from '../src/production.ts';
import {PALETTE_IDS} from '../src/variety.ts';
const root=resolve('.'),folder=join(root,'out/checkpoint-b');await mkdir(join(folder,'frames'),{recursive:true});
const json=async p=>JSON.parse(await readFile(p,'utf8')),j=await json('data/production-jobs/restaurant-fresh-02/job.json'),certificate=await json(j.renderCertificate),p=await json(certificate.propsFile);
const b=await readFile(join(root,'public',p.background.file)),width=b.readUInt32BE(16),height=b.readUInt32BE(20),timeline=getNarratedTimeline(p.narration,runtimeQuiz(p.quiz));
const empty=join(folder,'empty.env');await writeFile(empty,'');
for(const palette of PALETTE_IDS){const props=join(folder,`${palette}.props.json`);await writeFile(props,JSON.stringify({...p,variety:{version:'visual-variety-v1',palette,motion:'slow-push',width,height}}));
  for(const [name,frame] of [['countdown',timeline.questions[0].countdownStart+30],['reveal',timeline.questions[0].revealStart+30]])await runRemotion(['still','src/index.ts','KoreanProduction',join(folder,'frames',`${palette}-${name}.png`),`--props=${props}`,`--frame=${frame}`,`--env-file=${empty}`],true,120000);
}
const props=join(folder,'motion.props.json');await writeFile(props,JSON.stringify({source:p}));
await runRemotion(['render','scripts/checkpointBVisuals.tsx','MotionDiagnostics',join(folder,'motion-presets-silent.mp4'),`--props=${props}`,`--env-file=${empty}`,'--codec=h264','--pixel-format=yuv420p','--color-space=bt709','--crf=22','--concurrency=2'],true,300000);
await runRemotion(['ffmpeg','-v','error','-xerror','-i',join(folder,'motion-presets-silent.mp4'),'-c:v','rawvideo','-f','null','-'],true,60000);
for(const [i,id] of ['slow-push','slow-pull','slow-pan-left','slow-pan-right'].entries())for(const [suffix,local] of [['start',0],['end',149]])await runRemotion(['ffmpeg','-v','error','-ss',String((150*i+local)/30),'-i',join(folder,'motion-presets-silent.mp4'),'-frames:v','1',join(folder,'frames',`${id}-${suffix}.png`)],true,30000);
console.log('Eight palette stills and 20-second silent motion preview decoded. Zero providers.');
