import assert from 'node:assert/strict';
import test from 'node:test';
import {EPISODE_TIMING, getIllustratedEpisodeTimeline, getPanelExitOpacity, getQuizTimeline} from '../src/quizTimeline.ts';
import {getQuestionState, PREVIEW_QUESTION_TIMELINE, QUESTION_TIMELINE} from '../src/questionTiming.ts';

test('calculates starts and duration for different question counts', () => {
  assert.deepEqual(getQuizTimeline(1), {questionStarts: [0], durationInFrames: 390});
  assert.deepEqual(getQuizTimeline(2), {questionStarts: [0, 390], durationInFrames: 780});
  assert.deepEqual(getQuizTimeline(3), {questionStarts: [0, 390, 780], durationInFrames: 1170});
  assert.equal(getQuizTimeline(6).durationInFrames, 2340);
});

test('cuts have no gap or overlap and reset scene-local countdown/reveal state', () => {
  const {questionStarts, durationInFrames} = getQuizTimeline(3);
  for (let index = 0; index < questionStarts.length; index += 1) {
    const start = questionStarts[index];
    const end = index + 1 < questionStarts.length ? questionStarts[index + 1] : durationInFrames;
    assert.equal(end - start, QUESTION_TIMELINE.durationInFrames);
    assert.equal(getQuestionState((start + 239) - start).phase, 'countdown');
    assert.equal(getQuestionState((start + 240) - start).phase, 'reveal');
    assert.equal(getQuestionState(end - start - 1).phase, 'reveal');
  }
  assert.equal(getQuestionState(390 - questionStarts[1]).phase, 'reading');
});

test('rejects invalid counts rather than producing empty or fractional timelines', () => {
  for (const count of [0, -1, 1.5, 7, NaN]) assert.throws(() => getQuizTimeline(count), /Question count/u);
});

test('illustrated timeline includes opening, only intervening transitions, and ending for variable counts', () => {
  for (const [count, starts, duration] of [
    [1, [102], 579], [2, [102, 504], 981], [3, [102, 504, 906], 1383],
  ]) {
    const timeline = getIllustratedEpisodeTimeline({questions: Array(count).fill({})});
    assert.deepEqual(timeline.questionStarts, starts);
    assert.equal(timeline.durationInFrames, duration);
  }
  assert.equal(getIllustratedEpisodeTimeline({questions: Array(6).fill({})}).durationInFrames, 2589);
  assert.throws(() => getIllustratedEpisodeTimeline({questions: []}), /Question count/u);
});

test('every illustrated question preserves countdown/reveal boundaries and a complete reveal before exit', () => {
  const timeline = getIllustratedEpisodeTimeline({questions: Array(3).fill({})});
  const {question, transitionFrames} = EPISODE_TIMING;
  for (const [index, start] of timeline.questionStarts.entries()) {
    const stateAt = (episodeFrame) => getQuestionState(episodeFrame - start, question);
    assert.equal(stateAt(start + 119).phase, 'reading');
    assert.equal(stateAt(start + 120).secondsRemaining, 5);
    assert.equal(stateAt(start + 269).secondsRemaining, 1);
    assert.equal(stateAt(start + 270).phase, 'reveal');
    assert.equal(stateAt(start + 282).revealProgress, 1);
    const end = start + question.durationInFrames;
    assert.equal(end - (start + question.revealStart), 120);
    assert.equal(getPanelExitOpacity(389, 390, transitionFrames), 1);
    if (index < 2) {
      assert.equal(end + transitionFrames, timeline.questionStarts[index + 1]);
      assert.equal(getPanelExitOpacity(401, 390, transitionFrames), 0);
      assert.equal(stateAt(end - 1).phase, 'reveal');
      assert.equal(getQuestionState(0, question).phase, 'reading');
    } else {
      assert.equal(end + transitionFrames, timeline.scenes.at(-1).start);
    }
  }
  assert.equal(getPanelExitOpacity(500, 390, 0), 1);
  assert.equal(PREVIEW_QUESTION_TIMELINE.durationInFrames, 390);
});
