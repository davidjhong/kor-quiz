import type {QuizQuestion} from '../QuizQuestion';

// Draft educational content for human linguistic review; IDs survive copy edits.
export const cafeQuestions: readonly [QuizQuestion, QuizQuestion, QuizQuestion] = [
  {
    id: 'cafe-request-water',
    scenario: 'At a cafe counter',
    prompt: 'Ask the barista to give you water.',
    choices: ['물 있어요.', '물 주세요.', '물 마셔요.'],
    correctAnswerIndex: 1,
    explanation:
      '물 주세요 means “Water, please.” 주세요 politely asks someone to give you something.',
  },
  {
    id: 'cafe-takeaway',
    scenario: 'Choosing takeaway',
    prompt: 'You want your drink to go. What do you say?',
    choices: ['여기서 마실게요.', '다 마셨어요.', '포장해 주세요.'],
    correctAnswerIndex: 2,
    explanation:
      '포장해 주세요 asks for takeaway. 여기서 마실게요 means you will drink it here.',
  },
  {
    id: 'cafe-without-ice',
    scenario: 'Customizing your drink',
    prompt: 'Order your drink without ice. What do you say?',
    choices: ['얼음 빼 주세요.', '얼음 더 주세요.', '얼음 넣어 주세요.'],
    correctAnswerIndex: 0,
    explanation:
      '얼음 빼 주세요 asks to leave out the ice. 빼 주세요 asks for something to be removed or omitted.',
  },
];
