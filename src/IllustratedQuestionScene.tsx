import {interpolateColors, useCurrentFrame} from 'remotion';
import {FittedText} from './FittedText';
import {useIllustratedTheme} from './Palette';
import {getIllustratedQuestionState, PREVIEW_QUESTION_TIMELINE} from './questionTiming';
import {getChoiceHangul, getChoiceRomanization, type QuizQuestion} from './quizSchema';
import {IllustratedPanel} from './IllustratedFrame';
import {getPanelExitOpacity} from './quizTimeline';
import {BONUS_CTA_LABELS, type BonusCtaState} from './narration';
import {useCallback, useState} from 'react';
import {getCompactQuestionLayout,COMPACT_PROMPT_HEIGHT,COMPACT_CONTEXT_HEIGHT, type SpeechSpan} from './presentation';
import {NarrationCaption} from './NarrationCaption';
import {CountdownRow} from './CountdownRow';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';

type IllustratedQuestionSceneProps = {
  question: Omit<QuizQuestion,'correctAnswerIndex'|'explanation'> & Partial<Pick<QuizQuestion,'correctAnswerIndex'|'explanation'>>;
  questionIndex: number;
  questionCount: number;
  hideProgress?:boolean;
  showRomanization?: boolean;
  exitFrames?: number;
  bonus?: boolean;
  bonusCta?: BonusCtaState | null;
  compactSpacing?: boolean;
  explanationCaption?: string | null;
  narrationCaption?: SpeechSpan | null;
  hideRevealNotes?: boolean;
  settleFrames?: number;
  embedded?: boolean;
  contentOpacity?: number;
  questionTimeline?: typeof PREVIEW_QUESTION_TIMELINE;
};
const labels = ['A', 'B', 'C'] as const;

export const IllustratedQuestionScene = ({question, questionIndex, questionCount,
  showRomanization = false, exitFrames = 0, bonus = false, bonusCta = 'legacy-comment', settleFrames = 0,hideProgress=false,
  embedded = false, contentOpacity = 1, compactSpacing = false, explanationCaption, narrationCaption, hideRevealNotes = false,
  questionTimeline = PREVIEW_QUESTION_TIMELINE}: IllustratedQuestionSceneProps) => {
  const frame = useCurrentFrame();
  const state = getIllustratedQuestionState(frame - settleFrames, bonus, questionTimeline);
  const revealed = state.phase === 'reveal';
  const {colors, panel, slots, answers} = useIllustratedTheme();
  const [promptHeight, setPromptHeight] = useState(150);
  const [contextHeight, setContextHeight] = useState(question.context ? 36 : 0);
  const measuredPrompt = useCallback((height: number) => setPromptHeight(height), []);
  const measuredContext = useCallback((height: number) => setContextHeight(height), []);
  const layout = compactSpacing ? getCompactQuestionLayout(promptHeight, contextHeight)
    : {...slots, feedbackHeight: 164,feedbackDisplayHeight:120};
  const slot = (top: number) => ({position: 'absolute' as const, top,
    left: panel.padding, right: panel.padding});

  const content = <>
      <div style={{...slot(slots.header), display: 'flex', alignItems: 'center', gap: 24}}>
        <div style={{flex: 1, minWidth: 0}}>
          <FittedText text={question.difficulty
            ? `${question.difficulty.toUpperCase()}${bonus ? ' · BONUS' : ''} · ${question.scenario}` : question.scenario}
            label={`${question.id}.scenario`} height={36}
            fontSize={question.difficulty ? 21 : 23} minFontSize={20} lineHeight={1.4} fontWeight={700} letterSpacing={1} />
        </div>
        {!hideProgress?<div style={{fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{questionIndex + 1} / {questionCount}</div>:null}
      </div>
      <div style={slot(slots.prompt)}>
        <FittedText text={question.prompt} label={`${question.id}.prompt`} height={compactSpacing?COMPACT_PROMPT_HEIGHT:150}
          fontSize={64} minFontSize={48} lineHeight={1.13} fontWeight={700} letterSpacing={-1.3} balance
          onFit={compactSpacing ? measuredPrompt : undefined} />
      </div>
      {question.context ? <div style={{...slot(layout.context), color: colors.secondary}}>
        <FittedText text={question.context} label={`${question.id}.context`} height={compactSpacing?COMPACT_CONTEXT_HEIGHT:36}
          fontSize={24} minFontSize={22} lineHeight={1.4} onFit={compactSpacing ? measuredContext : undefined} />
      </div> : null}
      <div data-choice-top={layout.answers} style={{...slot(layout.answers), display: 'flex', flexDirection: 'column', gap: answers.gap}}>
        {question.choices.map((choice, index) => {
          const correct = revealed && index === question.correctAnswerIndex;
          const dimmed = revealed && !correct;
          return <div key={`${question.id}-${index}`} style={{height: answers.height, boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', gap: 24, padding: '16px 24px', borderRadius: 18,
            background: correct ? interpolateColors(state.revealProgress, [0, 1], [colors.answer, colors.correct])
              : dimmed ? colors.subdued : colors.answer,
            border: `2px solid ${correct ? colors.teal : 'transparent'}`,
            color: dimmed ? colors.secondary : colors.text}}>
            <div style={{width: 28, flexShrink: 0, fontSize: 25, fontWeight: 700}}>{labels[index]}</div>
            <div style={{flex: 1, minWidth: 0}}>
              <FittedText text={getChoiceHangul(choice)} label={`${question.id}.choices[${index}].hangul`}
                height={showRomanization ? 60 : 100} fontSize={answers.hangulSize} minFontSize={42}
                lineHeight={1.12} fontWeight={700} center lang="ko" />
              {showRomanization ? <div style={{marginTop: 3, color: colors.secondary}}>
                <FittedText text={getChoiceRomanization(choice)!} label={`${question.id}.choices[${index}].romanization`}
                  height={36} fontSize={answers.romanizationSize} minFontSize={28} lineHeight={1.15} />
              </div> : null}
            </div>
            <svg width={30} height={30} viewBox="0 0 30 30" style={{flexShrink: 0, visibility: correct ? 'visible' : 'hidden'}}>
              <path d="m5 15 7 7 13-14" fill="none" stroke={colors.teal} strokeWidth={4}
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>;
        })}
      </div>
      <div style={{...slot(layout.feedback), height: layout.feedbackHeight}}>
        {narrationCaption && (!bonus || !['answer', 'explanation'].includes(narrationCaption.role)) ? <NarrationCaption
          text={narrationCaption.text} height={layout.feedbackHeight} lang={narrationCaption.role === 'answer' ? 'ko' : undefined} />
          : bonus && state.phase === 'reading' ? <FittedText
          text="Final challenge: what would you say?" label="bonus introduction" height={layout.feedbackDisplayHeight}
          fontSize={32} minFontSize={30} lineHeight={1.4} fontWeight={700} center />
          : state.phase === 'comment' && bonusCta === null ? null
          : state.phase === 'comment' ? <div style={{display: 'flex', alignItems: 'center', gap: 18, height: 120}}>
          {bonusCta === 'legacy-comment' ? <>
          <svg width={32} height={32} viewBox="0 0 32 32" style={{flexShrink: 0}}>
            <path d="M6 5h20a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H14l-8 5v-5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"
              fill="none" stroke={colors.text} strokeWidth={2} strokeLinejoin="round" />
          </svg>
          <FittedText text="Comment A, B, or C below" label="comment invitation" height={108}
            fontSize={36} minFontSize={32} lineHeight={1.3} fontWeight={700} center />
          </> : <FittedText text={BONUS_CTA_LABELS[bonusCta ?? 'comment']} label={`${bonusCta} invitation`} height={108}
            fontSize={36} minFontSize={32} lineHeight={1.3} fontWeight={700} center />}
        </div> : revealed && hideRevealNotes ? null : revealed ? <div style={{opacity: state.revealProgress}}>
          {explanationCaption !== undefined ? <FittedText
            text={explanationCaption ?? question.reveal?.teachingPoint ?? question.explanation ?? ''}
            label={`${question.id}.${explanationCaption ? 'spoken-explanation' : 'written-language-note'}`}
            height={layout.feedbackHeight} fontSize={explanationCaption ? 33 : 29} minFontSize={28}
            lineHeight={1.35} lang={explanationCaption ? undefined : 'ko'} />
          : question.reveal ? <>
            <FittedText text={question.reveal.translation} label={`${question.id}.reveal.translation`}
              height={72} fontSize={49} minFontSize={38} lineHeight={1.3} fontWeight={700} />
            <div style={{color: colors.secondary, marginTop: 8}}>
              <FittedText text={question.reveal.teachingPoint} label={`${question.id}.reveal.teachingPoint`}
                height={84} fontSize={30} minFontSize={27} lineHeight={1.4} lang="ko" />
            </div>
          </> : <FittedText text={question.explanation??''} label={`${question.id}.explanation`}
            height={160} fontSize={29} minFontSize={26} lineHeight={1.45} />}
        </div> : <CountdownRow seconds={state.secondsRemaining} progress={state.countdownProgress} height={layout.feedbackDisplayHeight}
          visible={state.phase==='countdown'} color={colors.text} trackColor={colors.track} accent={colors.accent}/>}
      </div>
  </>;
  if (embedded) return <div style={{position: 'absolute', inset: 0, opacity: contentOpacity}}>{content}</div>;
  return <IllustratedPanel opacity={state.entranceProgress
    * getPanelExitOpacity(frame, questionTimeline.durationInFrames, exitFrames)}
    translateY={(1 - state.entranceProgress) * 12}>{content}</IllustratedPanel>;
};
