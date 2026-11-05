/** Local still fixtures only: no production content, TTS, API client or asset fallback. */
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './draftWorkflow.ts';
import {PROJECT_ROOT, runRemotion} from './remotionCommand.ts';

const folder = join(PROJECT_ROOT, 'out/phase5b-choice-layout');
await mkdir(folder, {recursive: true});
await writeFile(join(folder, 'empty.env'), '', 'utf8');
await writeFile(join(folder, 'index.tsx'), `import {AbsoluteFill, Composition, registerRoot} from 'remotion';
import {IllustratedQuestionScene} from '../../src/IllustratedQuestionScene';
const Probe = ({hangul,romanization}) => <AbsoluteFill style={{background:'#E9DECC'}}>
  <IllustratedQuestionScene question={{id:'local-layout-fixture',scenario:'LOCAL LAYOUT FIXTURE',
  prompt:'Local choice layout check',context:'Font-fit fixture only.', choices:[0,1,2].map(()=>({hangul,romanization})),
  correctAnswerIndex:0,explanation:'Unused fixture explanation.'}} questionIndex={0} questionCount={1} showRomanization />
</AbsoluteFill>;
registerRoot(() => <Composition id="ChoiceLayout" component={Probe} width={1080} height={1920} fps={30}
durationInFrames={390} defaultProps={{hangul:'물 주세요.',romanization:'mul juseyo.'}} />);
`, 'utf8');
const fixtures = [
  {id: 'short-complete', hangul: '다른 출구로 나가도 돼요?', romanization: 'dareun chulguro nagado dwaeyo?'},
  {id: 'near-limit', hangul: '시청으로 가려면 어느 출구로 가야 해요?', romanization: 'sicheongeuro garyeomyeon eoneu chulguro gaya haeyo?'},
  {id: 'longer-complete', hangul: '시청으로 가려면 어느 출구로 나가야 하나요?', romanization: 'sicheongeuro garyeomyeon eoneu chulguro nagaya hanayo?'},
];
const results = [];
for (const item of fixtures) {
  const propsFile = join(folder, `${item.id}.json`), imageFile = join(folder, `${item.id}.png`);
  await atomicJson(propsFile, item);
  try {
    await runRemotion(['still', join(folder, 'index.tsx'), 'ChoiceLayout', imageFile, '--frame=60',
      `--props=${propsFile}`, `--env-file=${join(folder, 'empty.env')}`, '--log=error'], true, 90000);
    results.push({...item, codePoints: [...item.hangul].length, romanizationCodePoints: [...item.romanization].length,
      fits: true, imageFile});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('text does not fit')) throw error; // Infrastructure failures are not layout findings.
    results.push({...item, codePoints: [...item.hangul].length, romanizationCodePoints: [...item.romanization].length,
      fits: false, error: message.slice(-1800)});
  }
}
await atomicJson(join(folder, 'results.json'), {kind: 'local-layout-fixtures', productionVideo: false,
  hangulFontFloor: 42, romanizationFontFloor: 28, results});
console.log(JSON.stringify(results, null, 2));
