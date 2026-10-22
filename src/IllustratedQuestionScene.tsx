import {interpolateColors, useCurrentFrame} from 'remotion';
import {FittedText} from './FittedText';
import {ILLUSTRATED_THEME} from './illustratedTheme';
import {getIllustratedQuestionState, PREVIEW_QUESTION_TIMELINE} from './questionTiming';
import {getChoiceHangul, getChoiceRomanization, type QuizQuestion} from './quizSchema';
import {IllustratedPanel} from './IllustratedFrame';
import {getPanelExitOpacity} from './quizTimeline';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';

type IllustratedQuestionSceneProps = {
  question: QuizQuestion;
  questionIndex: number;
  questionCount: number;
  showRomanization?: boolean;
  exitFrames?: number;
  bonus?: boolean;
  settleFrames?: number;
  embedded?: boolean;
  contentOpacity?: number;
};
const labels = ['A', 'B', 'C'] as const;

export const IllustratedQuestionScene = ({question, questionIndex, questionCount,
  showRomanization = false, exitFrames = 0, bonus = false, settleFrames = 0,
  embedded = false, contentOpacity = 1}: IllustratedQuestionSceneProps) => {
  const frame = useCurrentFrame();
  const state = getIllustratedQuestionState(frame - settleFrames, bonus);
  const revealed = state.phase === 'reveal';
  const {colors, panel, slots, answers} = ILLUSTRATED_THEME;
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
        <div style={{fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{questionIndex + 1} / {questionCount}</div>
      </div>
      <div style={slot(slots.prompt)}>
        <FittedText text={question.prompt} label={`${question.id}.prompt`} height={150}
          fontSize={64} minFontSize={48} lineHeight={1.13} fontWeight={700} letterSpacing={-1.3} balance />
      </div>
      {question.context ? <div style={{...slot(slots.context), color: colors.secondary}}>
        <FittedText text={question.context} label={`${question.id}.context`} height={36}
          fontSize={24} minFontSize={22} lineHeight={1.4} />
      </div> : null}
      <div style={{...slot(slots.answers), display: 'flex', flexDirection: 'column', gap: answers.gap}}>
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
      <div style={{...slot(slots.feedback), height: 164}}>
        {bonus && state.phase === 'reading' ? <FittedText
          text="Final challenge: what would you say?" label="bonus introduction" height={120}
          fontSize={32} minFontSize={30} lineHeight={1.4} fontWeight={700} center />
          : state.phase === 'comment' ? <div style={{display: 'flex', alignItems: 'center', gap: 18, height: 120}}>
          <svg width={32} height={32} viewBox="0 0 32 32" style={{flexShrink: 0}}>
            <path d="M6 5h20a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H14l-8 5v-5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"
              fill="none" stroke={colors.text} strokeWidth={2} strokeLinejoin="round" />
          </svg>
          <FittedText text="Comment A, B, or C below" label="comment invitation" height={108}
            fontSize={36} minFontSize={32} lineHeight={1.3} fontWeight={700} center />
        </div> : revealed ? <div style={{opacity: state.revealProgress}}>
          {question.reveal ? <>
            <FittedText text={question.reveal.translation} label={`${question.id}.reveal.translation`}
              height={72} fontSize={49} minFontSize={38} lineHeight={1.3} fontWeight={700} />
            <div style={{color: colors.secondary, marginTop: 8}}>
              <FittedText text={question.reveal.teachingPoint} label={`${question.id}.reveal.teachingPoint`}
                height={84} fontSize={30} minFontSize={27} lineHeight={1.4} lang="ko" />
            </div>
          </> : <FittedText text={question.explanation} label={`${question.id}.explanation`}
            height={160} fontSize={29} minFontSize={26} lineHeight={1.45} />}
        </div> : <div style={{height: 120, display: 'flex', alignItems: 'center', gap: 28,
          visibility: state.phase === 'countdown' ? 'visible' : 'hidden'}}>
          <div style={{width: 66, fontSize: 70, lineHeight: 1, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums'}}>{state.secondsRemaining ?? ''}</div>
          <div style={{height: 12, flex: 1, borderRadius: 8, background: colors.track, overflow: 'hidden'}}>
            <div style={{height: '100%', background: colors.accent, transformOrigin: 'left center',
              transform: `scaleX(${1 - state.countdownProgress})`}} />
          </div>
        </div>}
      </div>
  </>;
  if (embedded) return <div style={{position: 'absolute', inset: 0, opacity: contentOpacity}}>{content}</div>;
  return <IllustratedPanel opacity={state.entranceProgress
    * getPanelExitOpacity(frame, PREVIEW_QUESTION_TIMELINE.durationInFrames, exitFrames)}
    translateY={(1 - state.entranceProgress) * 12}>{content}</IllustratedPanel>;
};
