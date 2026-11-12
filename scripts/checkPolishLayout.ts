/** Layout stills only. Reuses authored JSON/cached speech; no paid services. */
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './draftWorkflow.ts';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';
import {readJsonFile} from './narrationFiles.ts';
import {draftToQuiz, draftSchema} from '../src/draftSchema.ts';
import {parseQuizInput} from '../src/quizSchema.ts';
const folder = join(PROJECT_ROOT, 'out/phase5c/layout'); await mkdir(folder, {recursive: true});
await writeFile(join(folder, 'empty.env'), '');
await writeFile(join(folder, 'index.tsx'), `import {Composition,registerRoot,useCurrentFrame} from 'remotion';
import {IllustratedQuestionScene} from '../../../src/IllustratedQuestionScene';
import {IllustratedPanel,IllustratedBackground} from '../../../src/IllustratedFrame';
const Probe=({quiz,index,caption})=>{const frame=useCurrentFrame();return <><IllustratedBackground assetId={quiz.backgroundAssetId}/><IllustratedPanel>
<IllustratedQuestionScene question={quiz.questions[index]} questionIndex={index} questionCount={quiz.questions.length}
showRomanization={quiz.showRomanization} embedded compactSpacing explanationCaption={frame>=300?caption:null}/>
</IllustratedPanel></>};
registerRoot(()=> <Composition id="PolishLayout" component={Probe} width={1080} height={1920} fps={30} durationInFrames={390}
defaultProps={{quiz:null,index:0,caption:''}}/>);`, 'utf8');
const cafe = parseQuizInput(await readJsonFile(join(PROJECT_ROOT, 'content/cafe-six.json')));
const transit = draftToQuiz(draftSchema.parse(await readJsonFile(join(PROJECT_ROOT, 'drafts/public-transit-02-candidate/draft.json'))));
const results = [];
for (const [label, quiz, manifestPath] of [['cafe', cafe, 'public/audio/cafe-six/manifest.json'],
  ['transit', transit, 'public/audio/public-transit-02/manifest.json']] as const) {
  const manifest = await readJsonFile(join(PROJECT_ROOT, manifestPath)) as {clips: {contentId: string; role: string; text: string}[]};
  const indices = quiz.questions.slice(0, 5).map((q, index) => ({index, length: q.prompt.length})).sort((a,b) => a.length-b.length);
  for (const [length, index] of [['short', indices[0].index], ['long', indices.at(-1)!.index]] as const) {
    const question = quiz.questions[index], caption = manifest.clips.find((c) => c.contentId === question.id && c.role === 'explanation')!.text;
    const props = join(folder, `${label}-${length}.json`); await atomicJson(props, {quiz,index,caption});
    for (const [state, frame] of [['reading',45],['countdown',150],['caption',330]] as const) {
      const file = join(folder, `${label}-${length}-${state}.png`);
      await runRemotion(['still', join(folder, 'index.tsx'), 'PolishLayout', file, `--props=${props}`,
        `--env-file=${join(folder,'empty.env')}`, `--frame=${frame}`, '--log=error'], true, 90000);
      results.push({label,length,id:question.id,state,frame,file,fit:'PASS'}); console.log(`Layout fits: ${label}-${length}-${state}`);
    }
  }
}
await atomicJson(join(folder,'report.json'),{localStillsOnly:true,sourceTextUnchanged:true,results});
