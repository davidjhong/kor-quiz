# PRIVATE automated development review

Content hash: `12ea1aa86028ed6cd17b7d0df4471e0567410e2297ffbf46a483eca7289e1af4`

Structural validation: **PASS**. Mode: **AUTOMATED DEVELOPMENT**. Human review: **NOT CLAIMED**.

Scenario brief: Beginner Korean shopping at a convenience store: finding a snack, asking the price, requesting a bag, and paying by card.
Audience: English-speaking adults learning practical beginner Korean for travel
Level: Beginner: two easy, two medium and two hard questions, with the sixth as the unanswered comment bonus

Render readiness: **READY**

## Validation failures

None.

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. A separate manual or automated linguistic review is required.
- Question 6: similar/contained choice text; a human must check distractor ambiguity

## Learning plan

Context: A beginner traveler shops at a convenience store, finds and checks snacks, requests a bag, and pays at checkout.

1. Ask a clerk where a specific snack is.
2. Ask the price of a snack you are holding.
3. Request exactly one shopping bag.
4. Tell the cashier you will pay by card.
5. Ask whether a snack is spicy.
6. Request a recommendation for a non-spicy snack.

## 1. production-video-20261112-bf4b8311-q1 — easy

Scenario: Finding potato chips
Prompt: Ask where the potato chips are.
Context: You cannot find the potato chips and want to ask a clerk.

- **A** 감자칩은 어디에 있어요? — gamjachibeun eodie isseoyo?
- **B** 음료수는 어디에 있어요? — eumnyosuneun eodie isseoyo?
- **C** 과자는 얼마예요? — gwajaneun eolmayeyo?

Private correct answer: **A**
Meaning: Where are the potato chips?
Explanation: 감자칩은 어디에 있어요? asks where the potato chips are; 은 marks 감자칩 as the topic.
Teaching point: 감자칩은 = potato chips \(topic\); 어디에 있어요? = where are they?

## 2. production-video-20261112-bf4b8311-q2 — easy

Scenario: Checking the price
Prompt: Ask how much this snack costs.
Context: You are holding a packaged snack and want to know its price.

- **A** 이 과자는 얼마예요? — i gwajaneun eolmayeyo?
- **B** 이 과자는 어디에 있어요? — i gwajaneun eodie isseoyo?
- **C** 이 음료는 얼마예요? — i eumnyoneun eolmayeyo?

Private correct answer: **A**
Meaning: How much is this snack?
Explanation: 이 과자는 얼마예요? asks the price of this snack. 얼마예요? is a polite way to ask how much something costs.
Teaching point: 이 과자는 = this snack; 얼마예요? = how much is it?

## 3. production-video-20261112-bf4b8311-q3 — medium

Scenario: Requesting a bag
Prompt: Ask for exactly one shopping bag.
Context: You have several items and need one bag for them.

- **A** 봉투 하나 주세요. — beontu hana juseyo.
- **B** 봉투 두 개 주세요. — beontu du gae juseyo.
- **C** 영수증 하나 주세요. — yeongsujeung hana juseyo.

Private correct answer: **A**
Meaning: One bag, please.
Explanation: 봉투 하나 주세요 means “One bag, please.” 하나 specifies one item in this polite request.
Teaching point: 봉투 = bag; 하나 주세요 = one, please

## 4. production-video-20261112-bf4b8311-q4 — medium

Scenario: Paying at checkout
Prompt: Tell the cashier you will pay by card.
Context: You have your bank card ready and want to use it at checkout.

- **A** 카드로 결제할게요. — kadeuro gyeoljehalgeyo.
- **B** 현금으로 결제할게요. — hyeongeumeuro gyeoljehalgeyo.
- **C** 봉투에 담아 주세요. — beontue dama juseyo.

Private correct answer: **A**
Meaning: I’ll pay by card.
Explanation: 카드로 결제할게요 means “I’ll pay by card.” 로 marks the payment method, and 할게요 expresses intention.
Teaching point: 카드로 = by card; 결제할게요 = I’ll pay

## 5. production-video-20261112-bf4b8311-q5 — hard

Scenario: Choosing a snack
Prompt: Ask whether this snack is spicy.
Context: You want to check the taste of a snack before choosing it.

- **A** 이 과자 매워요? — i gwaja maewoyo?
- **B** 이 과자 달아요? — i gwaja dalayo?
- **C** 이 과자 짜요? — i gwaja jjayo?

Private correct answer: **A**
Meaning: Is this snack spicy?
Explanation: 이 과자 매워요? asks whether this snack is spicy. 매워요 describes a spicy taste.
Teaching point: 이 과자 = this snack; 매워요? = is it spicy?

## 6. production-video-20261112-bf4b8311-q6 — hard — COMMENT BONUS

Scenario: Asking for a recommendation
Prompt: Ask the clerk to recommend a snack that is not spicy.
Context: You want a non-spicy snack and would like the clerk to suggest one.

- **A** 안 매운 과자 추천해 주세요. — an maeun gwaja chucheonhae juseyo.
- **B** 매운 과자 추천해 주세요. — maeun gwaja chucheonhae juseyo.
- **C** 안 단 과자 추천해 주세요. — an dan gwaja chucheonhae juseyo.

Private correct answer: **A**
Meaning: Please recommend a non-spicy snack.
Explanation: 안 매운 과자 추천해 주세요 asks for a non-spicy snack recommendation. 안 before 매운 negates the description.
Teaching point: 안 매운 = not spicy; 추천해 주세요 = please recommend

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Achird; Korean voice: ko-KR-Chirp3-HD-Achird
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-6-luna; prompt pipeline-concise-generation-v1-scenario
Generated: 2026-11-12T23:58:00.837Z; generation API cost estimate: $0.003085375 (not invoiced cost)
Reported token usage: \{"inputTokens":2475,"outputTokens":5552,"totalTokens":8027,"reasoningTokens":3827,"cachedInputTokens":0\}

Requested model: gpt-6-luna; returned model: gpt-6-luna; request ID: req\_a109b296123e4dfaaf070197cb047441
Schema: pipeline-concise-education-v1-scenario; attempts: 1; pricing verified: 2026-11-10

- production-video-20261112-bf4b8311-hook / hook / en-US: Can you say it in Korean?
- production-video-20261112-bf4b8311-q1-question / question / en-US: You’re looking for potato chips. What could you ask the clerk?
- production-video-20261112-bf4b8311-q1-answer / answer / ko-KR: 감자칩은 어디에 있어요?
- production-video-20261112-bf4b8311-q1-explanation / explanation / en-US: It asks where potato chips are; use it to locate an item.
- production-video-20261112-bf4b8311-q2-question / question / en-US: You have a snack in hand. How can you ask its price?
- production-video-20261112-bf4b8311-q2-answer / answer / ko-KR: 이 과자는 얼마예요?
- production-video-20261112-bf4b8311-q2-explanation / explanation / en-US: It asks the snack’s price; use this polite question when buying.
- production-video-20261112-bf4b8311-q3-question / question / en-US: You’ve picked your items and need one bag. What do you say?
- production-video-20261112-bf4b8311-q3-answer / answer / ko-KR: 봉투 하나 주세요.
- production-video-20261112-bf4b8311-q3-explanation / explanation / en-US: It requests one bag; the number word makes the quantity clear.
- production-video-20261112-bf4b8311-q4-question / question / en-US: The cashier is ready. How will you say you’re using your bank card?
- production-video-20261112-bf4b8311-q4-answer / answer / ko-KR: 카드로 결제할게요.
- production-video-20261112-bf4b8311-q4-explanation / explanation / en-US: You’ll pay by card; the ending politely states your intention.
- production-video-20261112-bf4b8311-q5-question / question / en-US: Before choosing it, how can you check whether the snack is spicy?
- production-video-20261112-bf4b8311-q5-answer / answer / ko-KR: 이 과자 매워요?
- production-video-20261112-bf4b8311-q5-explanation / explanation / en-US: It asks whether the snack is spicy; this checks its flavor.
- production-video-20261112-bf4b8311-q6-question / question / en-US: You want a mild snack. How would you ask the clerk for a suggestion?
- production-video-20261112-bf4b8311-q6-comment / comment / en-US: What do you think? Comment your answer\!
- production-video-20261112-bf4b8311-q6-follow / follow / en-US: Follow for more Korean\!

## Deterministic bonus ending

After the countdown, display Comment your answer 💬 while the comment clip plays. Keep all choices neutral and visible.
After that clip finishes, pause 1.5 seconds (45 frames).
At follow narration start, display Follow for more Korean ✨. Hold 1 second (30 frames) after it finishes, then use the existing 12-frame fade.
Clip durations and absolute scene frames await measured audio preparation; no duration is invented for this review.


Automated acceptance is recorded separately against this exact hash. Content changes invalidate it. A model review is not independent proof of Korean correctness. No human checklist or approval is required for this development mode.

## Automated acceptance state

Status: **accepted**
Reviewer model: gpt-6-luna; prompt: phase5b-automated-review-v1
Findings, exact requests/responses and reported usage are in automated-review/. No human approval is fabricated.
