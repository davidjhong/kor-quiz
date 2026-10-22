import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {getBackgroundAsset} from './assets/backgrounds';
import {FittedText} from './FittedText';
import {getQuestionState, PREVIEW_QUESTION_TIMELINE} from './questionTiming';
import {PREVIEW_LAYOUT} from './previewDesign';
import type {QuizInput} from './quizSchema';
import {getChoiceHangul} from './quizSchema';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';

export type PolishedQuestionPreviewProps = {quiz: QuizInput};
const green = '#bef397';
const choiceLabels = ['A', 'B', 'C'] as const;

export const PolishedQuestionPreview = ({quiz}: PolishedQuestionPreviewProps) => {
  const frame = useCurrentFrame();
  const questionIndex = 0; // Only the first question is rendered for visual review.
  const question = quiz.questions[questionIndex];
  const state = getQuestionState(frame, PREVIEW_QUESTION_TIMELINE);
  const revealed = state.phase === 'reveal';
  const asset = getBackgroundAsset(quiz.backgroundAssetId);
  const layout = PREVIEW_LAYOUT;
  if (layout.feedbackTop + 216 > 1920 - layout.margins.bottom) {
    throw new Error('Preview layout exceeds its configured bottom content margin');
  }
  const width = 1080 - layout.margins.left - layout.margins.right;
  const imageScale = layout.background.startScale + (layout.background.endScale - layout.background.startScale)
    * Math.min(1, frame / (PREVIEW_QUESTION_TIMELINE.durationInFrames - 1));
  const slot = (top: number) => ({position: 'absolute' as const, top, left: layout.margins.left, width});

  return <AbsoluteFill style={{background: '#10221c', color: '#f7faf4', fontFamily: '"Noto Sans KR", sans-serif'}}>
    {asset ? <Img src={staticFile(asset.file)} style={{width: '100%', height: '100%', objectFit: 'cover',
      objectPosition: layout.background.objectPosition, transform: `scale(${imageScale})`}} /> : null}
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(6,19,15,0.96) 0%, rgba(6,19,15,0.93) 27%, rgba(6,19,15,0.87) 51%, rgba(6,19,15,0.68) 67%, rgba(6,19,15,0.18) 83%, rgba(6,19,15,0.08) 100%)'}} />

    <div style={{...slot(layout.margins.top), display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <div style={{fontSize: 24, fontWeight: 700, letterSpacing: 4, color: green}}>{asset?.scenarioLabel ?? 'KOREAN QUIZ'}</div>
      <div style={{fontSize: 26, fontWeight: 700, color: '#d8e2d8', fontVariantNumeric: 'tabular-nums'}}>
        {questionIndex + 1} / {quiz.questions.length}
      </div>
    </div>

    {quiz.episodeTitle ? <div style={{...slot(layout.episodeTop), color: '#c7d3c9'}}>
      <FittedText text={quiz.episodeTitle} label="episodeTitle" height={48} fontSize={32} minFontSize={28} lineHeight={1.4} />
    </div> : null}

    <div style={{...slot(layout.promptTop), opacity: state.entranceProgress,
      transform: `translateY(${(1 - state.entranceProgress) * 18}px)`}}>
      <FittedText text={question.prompt} label={`${question.id}.prompt`} height={180} fontSize={74}
        minFontSize={56} lineHeight={1.18} fontWeight={700} letterSpacing={-1.5} balance />
    </div>
    <div style={{...slot(layout.contextTop), color: '#ced8d0'}}>
      <FittedText text={question.scenario} label={`${question.id}.scenario`} height={40} fontSize={26}
        minFontSize={24} lineHeight={1.45} />
    </div>

    <div style={{...slot(layout.cardsTop), display: 'flex', flexDirection: 'column', gap: layout.cardGap}}>
      {question.choices.map((choice, index) => {
        const correct = revealed && index === question.correctAnswerIndex;
        const dimmed = revealed && !correct;
        return <div key={`${question.id}-${index}`} style={{height: layout.cardHeight, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: 26, padding: '18px 28px', borderRadius: 24,
          background: correct ? green : 'rgba(17,34,28,0.97)',
          border: `2px solid ${correct ? green : dimmed ? '#34463b' : '#617367'}`,
          color: correct ? '#11291a' : dimmed ? '#a4b1a7' : '#f7faf4',
          boxShadow: correct ? '0 10px 38px rgba(0,0,0,0.18)' : 'none',
          transform: `scale(${correct ? 1 + 0.012 * state.revealProgress : 1})`}}>
          <div style={{width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 14, background: correct ? 'rgba(17,41,26,0.09)' : 'rgba(255,255,255,0.07)', fontSize: 27, fontWeight: 700}}>
            {choiceLabels[index]}
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <FittedText text={getChoiceHangul(choice)} label={`${question.id}.choices[${index}]`} height={94} fontSize={54}
              minFontSize={42} fontWeight={700} lineHeight={1.3} center lang="ko" />
          </div>
        </div>;
      })}
    </div>

    {revealed ? <div style={{...slot(layout.feedbackTop), opacity: state.revealProgress,
      transform: `translateY(${(1 - state.revealProgress) * 14}px)`}}>
      {question.reveal ? <>
        <div style={{color: green}}>
          <FittedText text={question.reveal.translation} label={`${question.id}.reveal.translation`}
            height={84} fontSize={58} minFontSize={46} fontWeight={700} lineHeight={1.3} />
        </div>
        <div style={{marginTop: 12, color: '#f0f5ed'}}>
          <FittedText text={question.reveal.teachingPoint} label={`${question.id}.reveal.teachingPoint`}
            height={100} fontSize={33} minFontSize={28} lineHeight={1.5} />
        </div>
      </> : <FittedText text={question.explanation} label={`${question.id}.explanation`} height={190}
        fontSize={32} minFontSize={28} lineHeight={1.5} />}
    </div> : <div style={{...slot(layout.feedbackTop), height: 106, display: 'flex', alignItems: 'center', gap: 28,
      visibility: state.phase === 'countdown' ? 'visible' : 'hidden'}}>
      <div style={{width: 88, fontSize: 84, fontWeight: 700, lineHeight: 1, color: green,
        fontVariantNumeric: 'tabular-nums', visibility: state.phase === 'countdown' ? 'visible' : 'hidden'}}>
        {state.secondsRemaining ?? ''}
      </div>
      <div style={{height: 12, flex: 1, background: '#4b5c4f', borderRadius: 8, overflow: 'hidden'}}>
        <div style={{height: '100%', width: '100%', background: green,
          transform: `scaleX(${1 - state.countdownProgress})`, transformOrigin: 'left center'}} />
      </div>
    </div>}
  </AbsoluteFill>;
};
