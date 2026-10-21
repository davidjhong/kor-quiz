import {AbsoluteFill, useCurrentFrame} from 'remotion';
import type {QuizQuestion} from './QuizQuestion';
import {getQuestionState} from './questionTiming';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';

type QuestionSceneProps = {question: QuizQuestion};

const mint = '#b9f48a';
const choiceLabels = ['A', 'B', 'C'] as const;
const ringCircumference = 2 * Math.PI * 49;

export const QuestionScene = ({question}: QuestionSceneProps) => {
  const frame = useCurrentFrame();
  const state = getQuestionState(frame);
  const revealed = state.phase === 'reveal';

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at 10% 0%, #233f3a, #101e24 65%)',
        color: '#f4f7f3',
        fontFamily: '"Noto Sans KR", sans-serif',
        fontWeight: 400,
        padding: '170px 96px 250px',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 14, height: 14, borderRadius: '50%', background: mint}} />
        <div style={{fontSize: 25, letterSpacing: 5, color: mint, fontWeight: 700}}>
          QUICK KOREAN
        </div>
      </div>

      <div
        style={{
          marginTop: 76,
          minHeight: 250,
          opacity: state.entranceProgress,
          transform: `translateY(${(1 - state.entranceProgress) * 24}px)`,
        }}
      >
        <div style={{fontSize: 28, color: '#a6bbb5', marginBottom: 22}}>
          {question.scenario}
        </div>
        <div style={{fontSize: 54, fontWeight: 700, lineHeight: 1.3, letterSpacing: -1}}>
          {question.prompt}
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 20, marginTop: 32}}>
        {question.choices.map((choice, index) => {
          const correct = revealed && index === question.correctAnswerIndex;
          return (
            <div
              key={`${question.id}-${index}`}
              style={{
                minHeight: 144,
                boxSizing: 'border-box',
                borderRadius: 26,
                border: `2px solid ${correct ? mint : '#3b514f'}`,
                background: correct ? mint : '#1c3034',
                color: correct ? '#18291f' : '#f4f7f3',
                display: 'flex',
                alignItems: 'center',
                padding: '20px 32px',
                gap: 26,
                opacity: revealed && !correct ? 0.45 : 1,
                transform: `scale(${correct ? 1 + 0.015 * state.revealProgress : 1})`,
              }}
            >
              <span style={{fontSize: 28, fontWeight: 700}}>{choiceLabels[index]}</span>
              <span lang="ko" style={{fontSize: 48, fontWeight: 700, lineHeight: 1.4, wordBreak: 'keep-all', overflowWrap: 'break-word', minWidth: 0}}>
                {choice}
              </span>
              {correct ? <span style={{fontSize: 24, marginLeft: 'auto', flexShrink: 0}}>YES!</span> : null}
            </div>
          );
        })}
      </div>

      <div style={{marginTop: 44, minHeight: 240}}>
        {revealed ? (
          <div style={{opacity: state.revealProgress, transform: `translateY(${(1 - state.revealProgress) * 16}px)`}}>
            <div style={{fontSize: 34, fontWeight: 700, color: mint}}>
              Answer {choiceLabels[question.correctAnswerIndex]}
            </div>
            <div style={{fontSize: 29, lineHeight: 1.6, marginTop: 16, color: '#c6d5cf', overflowWrap: 'break-word'}}>
              {question.explanation}
            </div>
          </div>
        ) : (
          <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
            <div style={{position: 'relative', width: 112, height: 112, flexShrink: 0}}>
              <svg width={112} height={112} viewBox="0 0 112 112">
                <circle cx={56} cy={56} r={49} fill="none" stroke="#334c49" strokeWidth={6} />
                <circle
                  cx={56} cy={56} r={49} fill="none" stroke={mint} strokeWidth={6}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={state.countdownProgress * ringCircumference}
                  transform="rotate(-90 56 56)"
                />
              </svg>
              <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 43, fontWeight: 700}}>
                {state.secondsRemaining ?? '?'}
              </div>
            </div>
            <div style={{fontSize: 28, color: '#c6d5cf'}}>
              {state.phase === 'countdown' ? 'Choose A, B, or C' : 'Read the question. Get ready.'}
            </div>
          </div>
        )}
      </div>

      <div style={{marginTop: 'auto', fontSize: 23, letterSpacing: 2, color: '#89a29b'}}>
        ONE PHRASE. ONE SMALL WIN.
      </div>
    </AbsoluteFill>
  );
};
