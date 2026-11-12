import {runVideo} from './videoCli.ts';
import {withSignalCancellation,ProductionCancelled} from './cancellation.ts';
withSignalCancellation(()=>runVideo(process.argv.slice(2))).catch((e:unknown)=>{
  console.error(e instanceof Error?e.message:'Video pipeline failed');process.exitCode=e instanceof ProductionCancelled?130:1;
});
