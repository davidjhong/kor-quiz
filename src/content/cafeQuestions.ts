import sample from '../../content/sample.json';
import {parseQuizInput} from '../quizSchema';

// Defaults for Studio and the legacy one-question composition; CLI props override them.
export const cafeQuiz = parseQuizInput(sample);
export const cafeQuestions = cafeQuiz.questions;
