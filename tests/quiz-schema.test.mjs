import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {CONTENT_LIMITS, parseQuizInput} from '../src/quizSchema.ts';

const sample = JSON.parse(readFileSync(new URL('../content/sample.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(sample);

test('accepts both local JSON inputs without changing their content', () => {
  assert.deepEqual(parseQuizInput(sample), sample);
  const short = JSON.parse(readFileSync(new URL('../content/short.json', import.meta.url), 'utf8'));
  assert.equal(parseQuizInput(short).questions.length, 2);
});

test('rejects out-of-range, noninteger, and string answer indices with question context', () => {
  for (const index of [-1, 3, 0.5, '1']) {
    const quiz = fresh();
    quiz.questions[0].correctAnswerIndex = index;
    assert.throws(() => parseQuizInput(quiz), /Question 1.*cafe-request-water.*questions\[0\]\.correctAnswerIndex/u);
  }
});

test('requires exactly three choices', () => {
  for (const choices of [['하나', '둘'], ['하나', '둘', '셋', '넷']]) {
    const quiz = fresh();
    quiz.questions[0].choices = choices;
    assert.throws(() => parseQuizInput(quiz), /choices/u);
  }
});

test('rejects empty and whitespace-only choices, including Unicode spaces', () => {
  for (const choice of ['', '   ', '\u3000\u00a0']) {
    const quiz = fresh();
    quiz.questions[0].choices[1] = choice;
    assert.throws(() => parseQuizInput(quiz), /choices\[1\].*whitespace-only/u);
  }
});

test('rejects duplicate choices after trimming and Hangul Unicode normalization', () => {
  const quiz = fresh();
  quiz.questions[0].choices[0] = `  ${quiz.questions[0].choices[1].normalize('NFD')}  `;
  assert.throws(() => parseQuizInput(quiz), /Duplicate choice/u);
});

test('compatibility/full-width variants also count as duplicate choices', () => {
  const quiz = fresh();
  quiz.questions[0].choices = ['Ａ', ' A ', 'B'];
  assert.throws(() => parseQuizInput(quiz), /Duplicate choice/u);
});

test('rejects duplicate IDs after normalization and trimming', () => {
  const quiz = fresh();
  quiz.questions[0].id = 'café';
  quiz.questions[1].id = ' café '.normalize('NFD');
  assert.throws(() => parseQuizInput(quiz), /Question 2.*questions\[1\]\.id: Duplicate question ID/u);
});

test('rejects overlong IDs, scenarios, prompts, choices, and explanations', () => {
  for (const field of ['id', 'scenario', 'prompt', 'explanation']) {
    const quiz = fresh();
    quiz.questions[0][field] = 'x'.repeat(CONTENT_LIMITS[field] + 1);
    assert.throws(() => parseQuizInput(quiz), /at most/u);
  }
  const quiz = fresh();
  quiz.questions[0].choices[2] = '가'.repeat(CONTENT_LIMITS.choice + 1);
  assert.throws(() => parseQuizInput(quiz), /choices\[2\].*at most/u);
});

test('requires a nonblank video ID and nonempty bounded question list', () => {
  for (const videoId of [undefined, '', '  ']) {
    assert.throws(() => parseQuizInput({...fresh(), videoId}), /videoId/u);
  }
  assert.throws(() => parseQuizInput({...fresh(), questions: []}), /At least one question/u);
  const questions = Array.from({length: CONTENT_LIMITS.questions + 1}, (_, index) => ({...sample.questions[0], id: `question-${index}`}));
  assert.throws(() => parseQuizInput({...fresh(), questions}), /At most 6 questions/u);
});

test('rejects whitespace-only prompts, multiline fields, and unknown properties', () => {
  for (const prompt of ['  ', 'first\nsecond', 'a\tb']) {
    const quiz = fresh();
    quiz.questions[0].prompt = prompt;
    assert.throws(() => parseQuizInput(quiz), /prompt/u);
  }
  assert.throws(() => parseQuizInput({...fresh(), typo: true}), /Unrecognized key/u);
});
