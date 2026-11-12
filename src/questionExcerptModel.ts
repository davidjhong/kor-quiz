// Separate from the TSX view to avoid case-insensitive Windows module resolution.
import {z} from 'zod';
import {quizQuestionSchema,getChoiceHangul} from './quizSchema.ts';
import {SCENARIO_TYPES} from './assets/backgrounds.ts';
import {renderBackgroundSchema} from './assets/backgroundSchema.ts';
import {preparedQuestionExcerptSchema,type PreparedNarration} from './narration.ts';
import {presentationSchema} from './presentation.ts';
import {phraseSchema} from './phraseCaptions.ts';
import {NARRATION_TIMING as R,audioDurationToFrames} from './narrationTiming.ts';
import {PREVIEW_QUESTION_TIMELINE} from './questionTiming.ts';
export const questionExcerptInputSchema=z.strictObject({version:z.literal(1),scenario:z.string().trim().min(1).max(1000),
  scenarioType:z.enum(SCENARIO_TYPES),question:quizQuestionSchema,
  explanationNarration:z.string().trim().min(1).max(180).regex(/^[^가-힣]*$/u)});
export const getQuestionExcerptTimeline=(n:PreparedNarration)=>{
  preparedQuestionExcerptSchema.parse(n);const clips=n.clips;
  const questionEnd=R.settlePause+audioDurationToFrames(clips[0].durationSeconds);
  const countdownStart=Math.max(R.readingMinimum,questionEnd+R.afterQuestion),revealStart=countdownStart+R.countdown;
  const answerStart=revealStart+R.settlePause,answerEnd=answerStart+audioDurationToFrames(clips[1].durationSeconds);
  const explanationStart=answerEnd+R.answerGap,speechEnd=explanationStart+audioDurationToFrames(clips[2].durationSeconds);
  const end=Math.max(revealStart+R.revealMinimum,speechEnd+R.afterExplanation),durationInFrames=end+R.finalFade;
  const starts=[R.settlePause,answerStart,explanationStart];
  return {durationInFrames,speechEnd,end,question:{countdownStart,revealStart},questionTimeline:{...PREVIEW_QUESTION_TIMELINE,
    countdownStart,revealStart,durationInFrames:end},audio:clips.map((c,i)=>({...c,start:starts[i],end:starts[i]+audioDurationToFrames(c.durationSeconds)}))};
};
export const questionExcerptPropsSchema=z.strictObject({input:questionExcerptInputSchema,background:renderBackgroundSchema,
  narration:preparedQuestionExcerptSchema,presentation:presentationSchema,phraseCaptions:z.array(phraseSchema),
  music:z.strictObject({file:z.string(),sha256:z.string(),durationSeconds:z.number().positive()}).nullable()}).superRefine((p,ctx)=>{
  try{const t=getQuestionExcerptTimeline(p.narration),q=p.input.question;
    if(p.background.scenarioType!==p.input.scenarioType)throw new Error('Excerpt background setting mismatch');
    if(p.narration.clips[0].text!==(q.spokenPrompt??q.prompt)||p.narration.clips[1].text!==getChoiceHangul(q.choices[q.correctAnswerIndex])
      ||p.narration.clips[2].text!==p.input.explanationNarration||p.narration.clips.some(c=>c.contentId!==q.id))throw new Error('Excerpt speech does not match exact source');
    for(const a of t.audio){if(p.phraseCaptions.filter(c=>c.clipId===a.id).map(c=>c.text).join(' ')!==a.text)throw new Error('Captions must cover each exact speech segment');}
    for(const c of p.phraseCaptions){const a=t.audio.find(a=>a.id===c.clipId);
      if(!a||a.role!==c.role||a.language!==c.language||a.contentId!==c.contentId||!a.text.includes(c.text)||c.start<a.start||c.end>a.end||
        (c.role!=='question'&&c.start<t.question.revealStart))throw new Error('Unsafe excerpt caption boundary');}
    for(let i=1;i<p.phraseCaptions.length;i++)if(p.phraseCaptions[i].start<p.phraseCaptions[i-1].end)throw new Error('Excerpt captions overlap');
  }catch(e){ctx.addIssue({code:'custom',message:(e as Error).message});}
});
export type QuestionExcerptProps=z.infer<typeof questionExcerptPropsSchema>;
