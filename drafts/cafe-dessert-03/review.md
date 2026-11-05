# PRIVATE content review — unapproved draft

Content hash: `852b9e625443da31b551517285997444768f00bb242aa6454780f89eca3bb44c`

Structural validation: **FAIL**. Linguistic approval: **NOT GRANTED**.

Scenario brief: At a café dessert counter: ask for a menu, order a slice of cake, request a fork, request an extra plate for sharing, ask whether a dessert contains nuts, and ask which desserts are available without milk. Avoid tasks from previous café episodes: greetings, coffee quantities or temperature, adding milk, takeaway, water, ice, cup return, phone charging, prices and drink replacement. Make each context explicit and keep the final task a hard beginner comment bonus.
Audience: English-speaking adults learning practical beginner Korean
Level: Beginner: two easy, two medium and two relatively hard questions, with polite requests and simple ingredient questions

Render readiness: **BLOCKED**

## Validation failures

- quiz.questions.0.scenario: Must contain at most 40 Unicode code points
- quiz.questions.5.spokenPrompt: Must not be empty or whitespace-only
- narration.segments.16.text: Too small: expected string to have \>=1 characters
- narration.segments.16.text: Must not be blank

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. Human review is required.

## 1. cafe-dessert-03-q1 — easy

Scenario: At a café dessert counter, you want to start by politely asking for the menu.
Prompt: Ask for the menu politely.
Context: In a café, you want to see what sweet options are available.

- **A** 메뉴 좀 보여 주세요. — menyu jom boyeojuseyo.
- **B** 메뉴 주세요. — menyu juseyo.
- **C** 메뉴 있어요? — menyu isseoyo?

Private correct answer: **A**
Meaning: Please show me the menu.
Explanation: 주세요 = please give me
Teaching point: 주세요 = please give me

## 2. cafe-dessert-03-q2 — easy

Scenario: At the counter
Prompt: Order a slice of cake.
Context: You want a single piece of cake.

- **A** 케이크 한 조각 주세요. — keikeu han jogak juseyo.
- **B** 케이크 주세요. — keikeu juseyo.
- **C** 케이크 맛있어요? — keikeu masisseoyo?

Private correct answer: **A**
Meaning: One slice of cake, please.
Explanation: 한 조각 = one piece
Teaching point: 한 조각 주세요 shows quantity

## 3. cafe-dessert-03-q3 — medium

Scenario: At the counter
Prompt: Ask whether the dessert contains nuts.
Context: You have an allergy to nuts and need to check ingredients.

- **A** 이 디저트에 견과류가 들어 있나요? — i dijeoteue gyeongwa-ryuga deureo innayo?
- **B** 견과류 있어요? — gyeongwa-ryu isseoyo?
- **C** 견과류 빼 주세요. — gyeongwa-ryu ppae juseyo.

Private correct answer: **A**
Meaning: Are there nuts in this dessert?
Explanation: 견과류 = nuts
Teaching point: Ask ingredient questions clearly

## 4. cafe-dessert-03-q4 — medium

Scenario: At the counter
Prompt: Ask which desserts are available without milk.
Context: You want dairy-free options.

- **A** 우유 없이 가능한 디저트가 어떤 게 있어요? — uyu eopsi ganeunghan dijeoteuga eotteon ge isseoyo?
- **B** 우유 들어간 디저트 있어요? — uyu deureogan dijeoteu isseoyo?
- **C** 우유 빼고 주세요. — uyu ppaego juseyo.

Private correct answer: **A**
Meaning: Which desserts are dairy-free?
Explanation: 우유 없이 = without milk
Teaching point: Ask about dairy-free options

## 5. cafe-dessert-03-q5 — hard

Scenario: At the counter
Prompt: You want to discuss sharing and request an extra plate for sharing.
Context: You plan to share a dessert with a friend.

- **A** 나눠 먹을 접시 하나 더 주세요. — nanwo meogeul jeopsi hana deo juseyo.
- **B** 접시 하나 주세요. — jeopsi hana juseyo.
- **C** 포크 하나 더 주세요. — pokeu hana deo juseyo.

Private correct answer: **A**
Meaning: Please give me one more plate for sharing.
Explanation: 하나 더 주세요 = one more plate
Teaching point: Request an extra plate for sharing

## 6. cafe-dessert-03-q6 — hard — COMMENT BONUS

Scenario: Bonus hard task: private review item.
Prompt: Determine a private answer index and rationale for creator review only.
Context: No public hints, for creator use.

- **A** 나눠 먹을 접시 하나 더 주세요. — nanwo meogeul jeopsi hana deo juseyo.
- **B** 메뉴 오늘 다 팔려요? — menyu oneul daryeoyo?
- **C** 케이크가 남았나요? — keikeuga namannayo?

Private correct answer: **A**
Meaning: Please give one more plate for sharing \(private answer\).
Explanation: This item is used for creator review to confirm difficulty level and teaching point alignment.
Teaching point: Private review note for content quality and alignment.

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Kore; Korean voice: ko-KR-Chirp3-HD-Kore
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-5-nano-2025-08-07; prompt phase5b-v1
Generated: 2026-11-05T05:59:02.172Z; generation API cost estimate: $0.00194055 (not invoiced cost)
Reported token usage: \{"inputTokens":2662,"outputTokens":1739,"totalTokens":4401,"reasoningTokens":640,"cachedInputTokens":0\}

Requested model: gpt-5-nano-2025-08-07; returned model: gpt-5-nano-2025-08-07; request ID: req\_09d9b91fc96f445397d51ce7600c544f
Schema: phase5b-education-v1; attempts: 2; pricing verified: 2026-11-04

- cafe-dessert-03-hook / hook / en-US: Can you say it in Korean?
- cafe-dessert-03-q1-question / question / en-US: 메뉴 좀 보여 주세요.
- cafe-dessert-03-q1-answer / answer / ko-KR: 메뉴 좀 보여 주세요.
- cafe-dessert-03-q1-explanation / explanation / en-US: Use a polite request to show interest in options.
- cafe-dessert-03-q2-question / question / en-US: 케이크 한 조각 주세요.
- cafe-dessert-03-q2-answer / answer / ko-KR: 케이크 한 조각 주세요.
- cafe-dessert-03-q2-explanation / explanation / en-US: A precise request helps staff prepare the right amount.
- cafe-dessert-03-q3-question / question / en-US: 이 디저트에 견과류가 들어 있나요?
- cafe-dessert-03-q3-answer / answer / ko-KR: 이 디저트에 견과류가 들어 있나요?
- cafe-dessert-03-q3-explanation / explanation / en-US: Ask about ingredients to avoid allergens.
- cafe-dessert-03-q4-question / question / en-US: 우유 없이 가능한 디저트가 어떤 게 있어요?
- cafe-dessert-03-q4-answer / answer / ko-KR: 우유 없이 가능한 디저트가 어떤 게 있어요?
- cafe-dessert-03-q4-explanation / explanation / en-US: Identify dairy-free desserts before choosing.
- cafe-dessert-03-q5-question / question / en-US: 나눠 먹을 접시 하나 더 주세요.
- cafe-dessert-03-q5-answer / answer / ko-KR: 나눠 먹을 접시 하나 더 주세요.
- cafe-dessert-03-q5-explanation / explanation / en-US: Use polite phrasing to plan sharing.
- cafe-dessert-03-q6-question / question / en-US: 
- cafe-dessert-03-q6-comment / comment / en-US: What do you think? Comment your answer\!
- cafe-dessert-03-q6-follow / follow / en-US: Follow for more Korean\!

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
