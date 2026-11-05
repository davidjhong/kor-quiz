# PRIVATE content review — unapproved draft

Content hash: `a55bcb2157895da6f48a89ac54d23587acf7c74f608789e5f77328f4527d2027`

Structural validation: **FAIL**. Linguistic approval: **NOT GRANTED**.

Scenario brief: Buying a snack and a ready meal at a convenience store: ask for a shopping bag, request chopsticks, ask staff to heat food, ask whether card payment is possible, locate an item, and ask whether a smaller size is available. Each question should make the requested item or service explicit. Use distinct tasks, and make the last permission or availability question the hard comment bonus.
Audience: English-speaking adults learning practical beginner Korean
Level: Beginner: progress from short polite requests to location and availability questions; two easy, two medium, two hard

Render readiness: **BLOCKED**
- Matching approved background missing for convenience-store; content review may proceed

## Validation failures

- quiz.questions.5.prompt: Must contain at most 100 Unicode code points

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. Human review is required.

## 1. convenience-store-01-q1 — easy

Scenario: Buying a snack and a ready meal at a 편의점
Prompt: Please ask for a shopping bag at the counter.
Context: You have two items and want a bag.

- **A** 봉투 주세요. — bongtu juseyo.
- **B** 봉투로 포장해 주세요. — bongturo pojanghae juseyo.
- **C** 가방 주세요. — gabang juseyo.

Private correct answer: **A**
Meaning: A bag, please.
Explanation:  주세요 = please give me; 봉투 is bag, 포장해 주세요 asks for packaging.
Teaching point: 주세요 = please give me; choose the brief, correct way to request a bag.

## 2. convenience-store-01-q2 — easy

Scenario: Buying a snack and a ready meal at a 편의점
Prompt: What do you say to ask for chopsticks?
Context: You want chopsticks to eat your meal.

- **A** 젓가락 주세요. — jeotgarak juseyo.
- **B** 젓가락으로 주세요. — jeotgarakseu juseyo.
- **C** 젓가락이 있어요? — jeotgaraki isseoyo?

Private correct answer: **A**
Meaning: Chopsticks, please.
Explanation:  주세요 새로 주세요 is incorrect; 젓가락 주세요 is the natural request.
Teaching point: 주세요 + item name is the standard pattern for a polite request.

## 3. convenience-store-01-q3 — medium

Scenario: Buying a snack and a ready meal at a 편의점
Prompt: Please have the staff heat your food.
Context: The ready meal is cold when you pick it up.

- **A** 데우고 주세요. — deugo juseyo.
- **B** 따뜻하게 데워 주세요. — ttatteuthage dewo juseyo.
- **C** 음식 데워 주세요. — eumsik dewo juseyo.

Private correct answer: **C**
Meaning: Please heat the food.
Explanation:  음식 데워 주세요 is natural in context; 데워 주세요 is common shorthand.
Teaching point: 데워 주세요 = please heat it up; position the verb appropriately.

## 4. convenience-store-01-q4 — medium

Scenario: Buying a snack and a ready meal at a 편의점
Prompt: Can I pay with a card?
Context: You want to know if card payment is possible.

- **A** 카드로 결제할 수 있어요? — kadeuro gyeolje halssoeyo?
- **B** 카드로 결제돼요? — kadeuro gyeoljedoen?
- **C** 현금으로만 계산해 주세요. — hyeongeumeu manually juseyo.

Private correct answer: **A**
Meaning: Can I pay by card?
Explanation:  카드로 결제할 수 있어요? is the natural question about card payment.
Teaching point: 카드로 결제할 수 있어요? = Can I pay with a card?

## 5. convenience-store-01-q5 — hard

Scenario: Buying a snack and a ready meal at a 편의점
Prompt: Could you help me locate a specific item in the aisle?
Context: You are looking for a particular snack.

- **A** 이쪽에 있나요? — ijjoge innayo?
- **B** 저쪽에 있어요? — jeojjoge isseoyo?
- **C** 이 품목은 어디에 있어요? — i pummok-eun eodi-e isseoyo?

Private correct answer: **C**
Meaning: Where is this item?
Explanation:  어디에 있어요? means where is it, with item reference.
Teaching point: 어디에 있어요? = where is it; use when asking for location of a specific item.

## 6. convenience-store-01-q6 — hard — COMMENT BONUS

Scenario: Bonus hard question \(public\)
Prompt: In this store, is there a smaller size available for this ready meal, and can I pay with a card if I want to buy it in that size?
Context: You want a smaller portion and wonder about payment.

- **A** 작은 사이즈 있어요? 카드로 결제해도 돼요? — jakeun saijeu isseoyo? kadeuro gyeoljehaedo dwaeyo?
- **B** 작게 포장돼요? 현금으로만 돼요? — jage pojangdo? hyeongeumeuroman dwaeyo?
- **C** 소용량 있어요? 카드로 결제해도 돼요? — soyongnyang isseoyo? kadeuro gyeoljehaedo dwaeyo?

Private correct answer: **A**
Meaning: Is the small size available, and can I pay by card?
Explanation: Private: correct answer supports both availability and card payment.
Teaching point: Availability first, then payment method in a combined question.

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Kore; Korean voice: ko-KR-Chirp3-HD-Kore
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-5-nano-2025-08-07; prompt phase5b-v2
Generated: 2026-11-05T06:04:14.643Z; generation API cost estimate: $0.0017171 (not invoiced cost)
Reported token usage: \{"inputTokens":2964,"outputTokens":1965,"totalTokens":4929,"reasoningTokens":704,"cachedInputTokens":0\}

Requested model: gpt-5-nano-2025-08-07; returned model: gpt-5-nano-2025-08-07; request ID: req\_11d8bed20cbc439f81566d3851c39667
Schema: phase5b-education-v2; attempts: 2; pricing verified: 2026-11-04

- convenience-store-01-hook / hook / en-US: Can you say it in Korean?
- convenience-store-01-q1-question / question / en-US: How would you ask for a bag to put your items in?
- convenience-store-01-q1-answer / answer / ko-KR: 봉투 주세요.
- convenience-store-01-q1-explanation / explanation / en-US: A simple polite request using 주세요 is common for items like bags.
- convenience-store-01-q2-question / question / en-US: How would you ask staff for chopsticks?
- convenience-store-01-q2-answer / answer / ko-KR: 젓가락 주세요.
- convenience-store-01-q2-explanation / explanation / en-US: Requesting utensils often uses the item followed by 주세요.
- convenience-store-01-q3-question / question / en-US: How would you ask to heat your meal?
- convenience-store-01-q3-answer / answer / ko-KR: 음식 데워 주세요.
- convenience-store-01-q3-explanation / explanation / en-US: Polite request to heat food should clearly reference the item.
- convenience-store-01-q4-question / question / en-US: Is card payment available here?
- convenience-store-01-q4-answer / answer / ko-KR: 카드로 결제할 수 있어요?
- convenience-store-01-q4-explanation / explanation / en-US: Ask about payment methods politely before paying.
- convenience-store-01-q5-question / question / en-US: Where is the oolong tea in this section?
- convenience-store-01-q5-answer / answer / ko-KR: 이 품목은 어디에 있어요?
- convenience-store-01-q5-explanation / explanation / en-US: Location questions help you find items efficiently.
- convenience-store-01-q6-question / question / en-US: Is a smaller size available, and can I pay by card if you choose that size?
- convenience-store-01-q6-comment / comment / en-US: What do you think? Comment your answer\!
- convenience-store-01-q6-follow / follow / en-US: Follow for more Korean\!

## Deterministic bonus ending

After the countdown, display Comment your answer 💬 while the comment clip plays. Keep all choices neutral and visible.
After that clip finishes, pause 1.5 seconds (45 frames).
At follow narration start, display Follow for more Korean ✨. Hold 1 second (30 frames) after it finishes, then use the existing 12-frame fade.
Clip durations and absolute scene frames await measured audio preparation; no duration is invented for this review.


## Human review checklist

- [ ] Korean is natural and appropriate for the intended politeness.
- [ ] Romanization matches the established convention and pronunciation.
- [ ] English scenario/prompt and meaning are clear and accurate.
- [ ] Exactly one choice is defensibly correct; alternatives cannot reasonably fit.
- [ ] Difficulty progression and repetitions suit beginners.
- [ ] Bonus narration/visuals disclose no answer; the neutral CTA is safe.
- [ ] All exact narration text and voice settings above are approved.

Approval is a separate human action bound to this hash. This document and deterministic checks cannot approve content.
