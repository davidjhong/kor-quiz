/** Compile-time contract for local content; runtime input validation comes later. */
export type QuizQuestion = {
  readonly id: string;
  readonly scenario: string;
  readonly prompt: string;
  readonly choices: readonly [string, string, string];
  readonly correctAnswerIndex: 0 | 1 | 2;
  readonly explanation: string;
};
