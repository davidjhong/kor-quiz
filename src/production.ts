import {visualVarietySchema} from './variety.ts';
import {renderMusicSchema,renderAmbienceSchema} from './musicLibrary.ts';
import {z} from 'zod';
import {draftQuizSchema} from './draftSchema.ts';
import {preparedNarrationSchema,validatePreparedNarrationPlan} from './narration.ts';
import {presentationSchema} from './presentation.ts';
import {phraseSchema} from './phraseCaptions.ts';
import {displayCuesSchema} from './displayBookends.ts';
import {getNarratedTimeline} from './narrationTiming.ts';
import type {QuizInput} from './quizSchema.ts';
import {renderBackgroundSchema} from './assets/backgroundSchema.ts';
import {productionPresetName,resolveProductionPreset} from './productionPresets.ts';
/** Legacy timing adapter stays internal; no bonus index/explanation is serialized. */
export const runtimeQuiz=(quiz:z.infer<typeof draftQuizSchema>):QuizInput=>({...quiz,
  backgroundAssetId:quiz.backgroundAssetId??undefined,questions:quiz.questions.map((q,i)=>i<5?q:{...q,correctAnswerIndex:0,explanation:'Withheld'})} as QuizInput);
export const productionPropsSchema=z.strictObject({quiz:draftQuizSchema,narration:preparedNarrationSchema,
  productionPreset:productionPresetName.optional(),countdownSeconds:z.literal(5).optional(),
  background:renderBackgroundSchema.optional(),variety:visualVarietySchema.optional(),
  presentation:presentationSchema,phraseCaptions:z.array(phraseSchema),displayCues:displayCuesSchema.optional(),
  music:renderMusicSchema.nullable(),ambience:renderAmbienceSchema.optional()}).superRefine((p,ctx)=>{
  try{
    if(p.background&&p.background.id!==p.quiz.backgroundAssetId)throw new Error('Background props do not match the content binding');
    const quiz=runtimeQuiz(p.quiz);validatePreparedNarrationPlan(quiz,p.narration);
    const t=getNarratedTimeline(p.narration,quiz,resolveProductionPreset(p.productionPreset,p.countdownSeconds).timing),bonus=t.questions.at(-1)!;
    if(!bonus.bonus||bonus.followStart===undefined)throw new Error('Production requires a spoken bonus question and separate comment/follow audio');
    if(p.presentation.bookendStyle==='display'&&(!p.displayCues||p.quiz.episodeTitle!=='Can you say it in Korean?'))throw new Error('Display style requires the current exact hook and cached display cues; choose a classic presentation for another hook');
    for(const a of t.audio){
      const phrases=p.phraseCaptions.filter(c=>c.clipId===a.id);
      if(p.presentation.synchronizedCaptions&&phrases.map(c=>c.text).join(' ')!==a.text)throw new Error(`${a.id}: captions do not cover exact narration`);
    }
    for(const c of p.phraseCaptions){
      const a=t.audio.find(a=>a.id===c.clipId),q=t.questions.find(q=>q.id===c.contentId);
      if(!a||a.role!==c.role||a.contentId!==c.contentId||a.language!==c.language||!a.text.includes(c.text)||c.start<a.start||c.end>a.end||c.end<=c.start
        ||(['answer','explanation'].includes(c.role)&&(!q||q.bonus||c.start<q.revealStart)))throw new Error('Unsafe caption identity, timing or bonus disclosure');
    }
    for(let i=1;i<p.phraseCaptions.length;i++)if(p.phraseCaptions[i].start<p.phraseCaptions[i-1].end)throw new Error('Overlapping captions');
  }catch(e){ctx.addIssue({code:'custom',message:e instanceof Error?e.message:'Invalid production timeline'});}
});
export type ProductionProps=z.infer<typeof productionPropsSchema>;
