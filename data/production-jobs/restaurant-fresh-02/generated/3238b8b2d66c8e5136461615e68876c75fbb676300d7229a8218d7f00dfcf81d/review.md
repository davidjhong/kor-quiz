# PRIVATE automated development review

Content hash: `98659d8c82e7ca00834d3212fbf3df5fe6462b34de7c7b980e6e1f3dc2eb6bc0`

Structural validation: **PASS**. Mode: **AUTOMATED DEVELOPMENT**. Human review: **NOT CLAIMED**.

Scenario brief: Beginner Korean ordering dinner at a restaurant, including choosing a dish, ordering a drink, adjusting an order, and asking for the bill.
Audience: English-speaking adults learning practical beginner Korean for travel
Level: Beginner: two easy, two medium and two hard questions, with the sixth as the unanswered comment bonus

Render readiness: **READY**

## Validation failures

None.

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. A separate manual or automated linguistic review is required.

## Learning plan

Context: An English-speaking beginner is ordering dinner at a restaurant, making simple choices and polite requests, then paying.

1. Order a chosen dinner dish politely.
2. Request one cup of a specific drink.
3. Ask for a dish to be made less spicy.
4. Ask for a particular ingredient to be left out.
5. Request the bill after finishing dinner.
6. Ask to pay separately when dining with a friend.

## 1. production-restaurant-fresh-02-q1 — easy

Scenario: Choosing a dinner dish
Prompt: Choose bibimbap from the menu. What would you say?
Context: You have decided to order bibimbap for dinner.

- **A** 비빔밥 주세요. — bibimbap juseyo.
- **B** 불고기 주세요. — bulgogi juseyo.
- **C** 김치찌개 주세요. — gimchi-jjigae juseyo.

Private correct answer: **A**
Meaning: Bibimbap, please.
Explanation: This politely asks for bibimbap. The dish name comes before the request ending.
Teaching point: 비빔밥 = bibimbap; 주세요 = please give me

## 2. production-restaurant-fresh-02-q2 — easy

Scenario: Ordering a drink
Prompt: Order one cup of barley tea. What would you say?
Context: You want one cup of barley tea with dinner.

- **A** 보리차 한 잔 주세요. — bori-cha han jan juseyo.
- **B** 물 한 잔 주세요. — mul han jan juseyo.
- **C** 주스 한 잔 주세요. — juseu han jan juseyo.

Private correct answer: **A**
Meaning: One cup of barley tea, please.
Explanation: This requests one cup of barley tea. The counter phrase 한 잔 is used for a cup or glass of a drink.
Teaching point: 한 잔 = one cup/glass; 보리차 = barley tea

## 3. production-restaurant-fresh-02-q3 — medium

Scenario: Adjusting the spice level
Prompt: Ask for your dish to be less spicy. What would you say?
Context: The kitchen can make your dish less spicy.

- **A** 덜 맵게 해 주세요. — deol maepge hae juseyo.
- **B** 더 맵게 해 주세요. — deo maepge hae juseyo.
- **C** 덜 짜게 해 주세요. — deol jjage hae juseyo.

Private correct answer: **A**
Meaning: Please make it less spicy.
Explanation: This asks the kitchen to reduce the spice. 덜 means less, while 더 means more.
Teaching point: 덜 맵게 = less spicy; 해 주세요 = please make/do

## 4. production-restaurant-fresh-02-q4 — medium

Scenario: Requesting no onion
Prompt: Ask for the onions to be left out. What would you say?
Context: Your dish includes onions, and you do not want any.

- **A** 양파 빼 주세요. — yangpa ppae juseyo.
- **B** 마늘 빼 주세요. — maneul ppae juseyo.
- **C** 고추 빼 주세요. — gochu ppae juseyo.

Private correct answer: **A**
Meaning: Please leave out the onions.
Explanation: This asks for onions to be omitted. The verb 빼다 means to leave something out or remove it.
Teaching point: 양파 = onion; 빼 주세요 = please leave out

## 5. production-restaurant-fresh-02-q5 — hard

Scenario: Asking for the bill
Prompt: You are ready to pay. Ask for the bill.
Context: You have finished dinner and have not paid yet.

- **A** 계산서 주세요. — gyesanseo juseyo.
- **B** 메뉴판 주세요. — menyupan juseyo.
- **C** 물 좀 주세요. — mul jom juseyo.

Private correct answer: **A**
Meaning: The bill, please.
Explanation: This asks for the bill before payment. 주세요 makes the request polite.
Teaching point: 계산서 = bill; 주세요 = please give me

## 6. production-restaurant-fresh-02-q6 — hard — COMMENT BONUS

Scenario: Splitting the bill
Prompt: You and your friend will pay separately. What would you say?
Context: You are dining together, and each person will pay for their own meal.

- **A** 따로 계산해 주세요. — ttaro gyesanhae juseyo.
- **B** 한 번에 계산해 주세요. — han beone gyesanhae juseyo.
- **C** 카드로 계산해 주세요. — kadeuro gyesanhae juseyo.

Private correct answer: **A**
Meaning: Please let us pay separately.
Explanation: This requests separate payment. 따로 means separately, and 계산해 주세요 is a polite request to handle the payment.
Teaching point: 따로 = separately; 계산해 주세요 = please handle the payment

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Achird; Korean voice: ko-KR-Chirp3-HD-Achird
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-6-luna; prompt phase6-scenario-generation-v1
Generated: 2026-11-12T07:24:35.774Z; generation API cost estimate: $0.00172975 (not invoiced cost)
Reported token usage: \{"inputTokens":2338,"outputTokens":2875,"totalTokens":5213,"reasoningTokens":1162,"cachedInputTokens":0\}

Requested model: gpt-6-luna; returned model: gpt-6-luna; request ID: req\_234dc2e7300b405d8cd73548ba067c76
Schema: phase6-scenario-education-v1; attempts: 1; pricing verified: 2026-11-10

- production-restaurant-fresh-02-hook / hook / en-US: Can you say it in Korean?
- production-restaurant-fresh-02-q1-question / question / en-US: You’ve chosen bibimbap for dinner. How would you order it?
- production-restaurant-fresh-02-q1-answer / answer / ko-KR: 비빔밥 주세요.
- production-restaurant-fresh-02-q1-explanation / explanation / en-US: Bibimbap, please. Put the dish you want before the polite phrase used to ask for something.
- production-restaurant-fresh-02-q2-question / question / en-US: You’d like a cup of barley tea with your meal. How do you order it?
- production-restaurant-fresh-02-q2-answer / answer / ko-KR: 보리차 한 잔 주세요.
- production-restaurant-fresh-02-q2-explanation / explanation / en-US: One cup of barley tea, please. The phrase for one cup or glass comes after the drink name.
- production-restaurant-fresh-02-q3-question / question / en-US: You enjoy the dish, but want less heat. How would you ask?
- production-restaurant-fresh-02-q3-answer / answer / ko-KR: 덜 맵게 해 주세요.
- production-restaurant-fresh-02-q3-explanation / explanation / en-US: Please make it less spicy. The word for less can also be used with other descriptions, such as salty.
- production-restaurant-fresh-02-q4-question / question / en-US: Your meal comes with onions, but you’d prefer none. What would you ask?
- production-restaurant-fresh-02-q4-answer / answer / ko-KR: 양파 빼 주세요.
- production-restaurant-fresh-02-q4-explanation / explanation / en-US: Please leave out the onions. The verb in this request means to remove something or leave it out.
- production-restaurant-fresh-02-q5-question / question / en-US: You’ve finished eating and are ready to settle up. What would you ask for?
- production-restaurant-fresh-02-q5-answer / answer / ko-KR: 계산서 주세요.
- production-restaurant-fresh-02-q5-explanation / explanation / en-US: The bill, please. The first word means bill, and the ending turns it into a polite request.
- production-restaurant-fresh-02-q6-question / question / en-US: You and your friend are paying for your own meals. How would you ask to handle the bill?
- production-restaurant-fresh-02-q6-comment / comment / en-US: What do you think? Comment your answer\!
- production-restaurant-fresh-02-q6-follow / follow / en-US: Follow for more Korean\!

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
