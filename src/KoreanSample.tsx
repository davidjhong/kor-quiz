import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';

const mint = '#b9f48a';

export const KoreanSample = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const countdownStart = 2 * fps;
  const revealAt = 7 * fps;
  const revealed = frame >= revealAt;
  const counting = frame >= countdownStart && !revealed;
  const remaining = Math.max(1, Math.ceil((revealAt - frame) / fps));
  const progress = interpolate(frame, [countdownStart, revealAt], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const entrance = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const revealProgress = interpolate(frame, [revealAt, revealAt + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Every visual depends on the frame number, never on a wall clock or CSS timer.
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
          marginTop: 120,
          opacity: entrance,
          transform: `translateY(${(1 - entrance) * 24}px)`,
        }}
      >
        <div style={{fontSize: 29, color: '#a6bbb5', marginBottom: 24}}>AT A CAFE</div>
        <div style={{fontSize: 68, fontWeight: 700, lineHeight: 1.24, letterSpacing: -2}}>
          Ask for water,<br />politely.
        </div>
        <div style={{fontSize: 30, color: '#b8c8c1', marginTop: 28}}>
          Which phrase would you use?
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 24, marginTop: 64}}>
        {['물 주세요.', '커피 주세요.'].map((phrase, index) => {
          const correct = revealed && index === 0;
          return (
            <div
              key={phrase}
              style={{
                height: 156,
                borderRadius: 26,
                border: `2px solid ${correct ? mint : '#3b514f'}`,
                background: correct ? mint : '#1c3034',
                color: correct ? '#18291f' : '#f4f7f3',
                display: 'flex',
                alignItems: 'center',
                padding: '0 36px',
                gap: 30,
                opacity: revealed && index === 1 ? 0.45 : 1,
                transform: `scale(${correct ? 1 + 0.015 * revealProgress : 1})`,
              }}
            >
              <span style={{fontSize: 28, fontWeight: 700}}>{index === 0 ? 'A' : 'B'}</span>
              <span lang="ko" style={{fontSize: 53, fontWeight: 700}}>{phrase}</span>
              {correct ? <span style={{fontSize: 26, marginLeft: 'auto'}}>YES!</span> : null}
            </div>
          );
        })}
      </div>

      <div style={{marginTop: 64, minHeight: 220}}>
        {revealed ? (
          <div style={{opacity: revealProgress, transform: `translateY(${(1 - revealProgress) * 16}px)`}}>
            <div style={{fontSize: 39, fontWeight: 700, color: mint}}>Water, please.</div>
            <div style={{fontSize: 29, lineHeight: 1.6, marginTop: 16, color: '#c6d5cf'}}>
              <span lang="ko">주세요</span> is a polite way to ask<br />someone to give you something.
            </div>
          </div>
        ) : (
          <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
            <div style={{position: 'relative', width: 112, height: 112}}>
              <svg width={112} height={112} viewBox="0 0 112 112">
                <circle cx={56} cy={56} r={49} fill="none" stroke="#334c49" strokeWidth={6} />
                <circle
                  cx={56} cy={56} r={49} fill="none" stroke={mint} strokeWidth={6}
                  strokeDasharray={2 * Math.PI * 49}
                  strokeDashoffset={(1 - progress) * 2 * Math.PI * 49}
                  transform="rotate(-90 56 56)"
                />
              </svg>
              <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 43, fontWeight: 700}}>
                {counting ? remaining : '?'}
              </div>
            </div>
            <div style={{fontSize: 28, color: '#c6d5cf'}}>
              {counting ? 'Choose A or B' : 'Ready? Think it through.'}
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
