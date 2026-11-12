import {z} from 'zod';
import {voiceProfileSchema, preparedNarrationSchema, type PreparedNarration} from './narration.ts';
import {presentationSchema} from './presentation.ts';
import {getNarratedTimeline, NARRATION_TIMING, audioDurationToFrames} from './narrationTiming.ts';
import {quizInputSchema, type QuizInput} from './quizSchema.ts';
import {phraseSchema} from './phraseCaptions.ts';
import {displayCuesSchema} from './displayBookends.ts';
export const auditionProfileSchema = z.strictObject({id: z.enum(['a-baseline', 'b-puck', 'c-achird']), label: z.string(), profile: voiceProfileSchema});
export const comparisonConfigSchema = z.strictObject({id: z.literal('transit-01'), draftDirectory: z.string(),
  expectedContentHash: z.string().regex(/^[a-f0-9]{64}$/u), questionId: z.string(), profiles: z.array(z.string()).length(3),
  captionPhrases: z.string().optional(),
  bonusPreview:z.strictObject({visualOnly:z.literal(true),readingTimingManifest:z.string()}).optional(),presentation: presentationSchema});
export const comparisonPropsSchema = z.strictObject({quiz: quizInputSchema, questionIndex: z.number().int().min(0).max(4),
  narration: preparedNarrationSchema, presentation: presentationSchema, phraseCaptions: z.array(phraseSchema).default([]),
  bonusReadingFrames:z.number().int().min(120).max(300).optional(),displayCues:displayCuesSchema.optional(),
  music: z.strictObject({file: z.string(), sha256: z.string(), durationSeconds: z.number().positive()}).nullable()}).superRefine((props,ctx)=>{
    if(props.presentation.bookendStyle==='display' && (!props.displayCues || !props.bonusReadingFrames))
      ctx.addIssue({code:'custom',path:['displayCues'],message:'Display excerpt needs cached word cues and explicit visual-only bonus timing'});
    if(props.presentation.captionStyle!=='phrases')return;
    if(!props.presentation.synchronizedCaptions || !props.phraseCaptions.length){
      ctx.addIssue({code:'custom',path:['phraseCaptions'],message:'Phrase mode requires prepared local alignment and enabled captions'});return;
    }
    const t=getComparisonTimeline(props.quiz,props.questionIndex,props.narration,props.bonusReadingFrames);
    const bonusId=props.narration.clips[4].contentId;
    for(const phrase of props.phraseCaptions){
      const clip=t.audio.find(c=>c.id===phrase.clipId);
      if(!clip || clip.contentId!==phrase.contentId || clip.role!==phrase.role || clip.language!==phrase.language
        || !clip.text.includes(phrase.text) || phrase.start<clip.start || phrase.end>clip.end || phrase.end<=phrase.start
        || (['answer','explanation'].includes(phrase.role) && (phrase.start<t.question.revealStart || phrase.contentId===bonusId)))
        ctx.addIssue({code:'custom',path:['phraseCaptions'],message:'Caption identity/timing violates measured public narration'});
    }
  });
export type ComparisonProps = z.infer<typeof comparisonPropsSchema>;
export const getComparisonTimeline = (quiz: QuizInput, questionIndex: number, narration: PreparedNarration,bonusReadingFrames?:number) => {
  if (narration.clips.length !== 6 || JSON.stringify(narration.clips.map((c) => c.role)) !== JSON.stringify(['hook', 'question', 'answer', 'explanation', 'comment', 'follow'])) throw new Error('Comparison requires exactly hook/question/answer/explanation/comment/follow');
  const excerptQuiz = {...quiz, questions: [quiz.questions[questionIndex]], endingMode: 'standard' as const, minimumDurationSeconds: undefined};
  const base = getNarratedTimeline({...narration, clips: narration.clips.slice(0, 4)}, excerptQuiz);
  const question = base.questions[0], r = NARRATION_TIMING;
  question.sequenceEnd = question.end + r.transition / 2;
  if(bonusReadingFrames!==undefined && (!Number.isInteger(bonusReadingFrames)||bonusReadingFrames<r.readingMinimum||bonusReadingFrames>300))throw new Error('Invalid visual-only bonus reading duration');
  const start = question.end + r.transition, countdownStart=start+(bonusReadingFrames??0),
    revealStart=countdownStart+(bonusReadingFrames===undefined?0:r.countdown),commentStart = revealStart + r.settlePause;
  const commentEnd = commentStart + audioDurationToFrames(narration.clips[4].durationSeconds);
  const followStart = commentEnd + r.afterComment;
  const followEnd = followStart + audioDurationToFrames(narration.clips[5].durationSeconds);
  const end = followEnd + r.afterFollow, durationInFrames = end + r.finalFade;
  const ending = {kind: 'ending-demo' as const, start, end, sequenceStart: start - r.transition / 2,
    sequenceEnd: durationInFrames, commentStart, commentEnd, followStart, followEnd};
  const audio = [...base.audio, ...narration.clips.slice(4).map((clip, i) => ({...clip,
    start: i ? followStart : commentStart, end: i ? followEnd : commentEnd}))];
  const bonus=bonusReadingFrames===undefined?undefined:{kind:'question' as const,bonus:true,start,end:followStart,
    sequenceStart:start-r.transition/2,sequenceEnd:followStart,countdownStart,revealStart,
    questionTimeline:{...question.questionTimeline,countdownStart:countdownStart-start,revealStart:revealStart-start,durationInFrames:followStart-start}};
  return {opening: base.scenes[0], question, ending, bonus, audio, durationInFrames, speechEnd: followEnd};
};
