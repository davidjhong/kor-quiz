import assert from 'node:assert/strict';
import test from 'node:test';
import {getQuestionState, QUESTION_TIMELINE} from '../src/questionTiming.ts';

test('reading lasts three seconds, then the countdown begins at five', () => {
  assert.equal(getQuestionState(0).phase, 'reading');
  assert.equal(getQuestionState(89).phase, 'reading');
  assert.equal(getQuestionState(89).secondsRemaining, null);
  assert.equal(getQuestionState(90).phase, 'countdown');
  assert.equal(getQuestionState(90).secondsRemaining, 5);
});

test('each countdown digit occupies one second at 30 FPS', () => {
  for (const [firstFrame, expectedDigit] of [[90, 5], [120, 4], [150, 3], [180, 2], [210, 1]]) {
    assert.equal(getQuestionState(firstFrame).secondsRemaining, expectedDigit);
    assert.equal(getQuestionState(firstFrame + 29).secondsRemaining, expectedDigit);
  }
});

test('the reveal starts at frame 240 without showing a zero countdown', () => {
  assert.equal(getQuestionState(239).phase, 'countdown');
  assert.equal(getQuestionState(239).secondsRemaining, 1);
  assert.equal(getQuestionState(240).phase, 'reveal');
  assert.equal(getQuestionState(240).secondsRemaining, null);
  assert.equal(getQuestionState(240).revealProgress, 0);
  assert.equal(getQuestionState(252).revealProgress, 1);
});

test('the ring is full during reading and empty at reveal', () => {
  assert.equal(getQuestionState(0).countdownProgress, 0);
  assert.equal(getQuestionState(90).countdownProgress, 0);
  assert.equal(getQuestionState(165).countdownProgress, 0.5);
  assert.equal(getQuestionState(240).countdownProgress, 1);
});

test('the scene ends after five seconds of reveal, at 390 frames total', () => {
  assert.equal(QUESTION_TIMELINE.durationInFrames, 390);
  assert.equal(getQuestionState(389).phase, 'reveal');
  assert.equal(getQuestionState(389).revealProgress, 1);
});
