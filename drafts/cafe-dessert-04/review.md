# PRIVATE content review — unapproved draft

Content hash: `5c8a733d903330b9b8c5ee36209de541804f50744c2c95f3ad8812a9f89fb6a8`

Structural validation: **PASS**. Linguistic approval: **NOT GRANTED**.

Scenario brief: At a café dessert counter: ask for a menu, order a slice of cake, request a fork, request an extra plate for sharing, ask whether a dessert contains nuts, and ask which desserts are available without milk. Avoid tasks from previous café episodes: greetings, coffee quantities or temperature, adding milk, takeaway, water, ice, cup return, phone charging, prices and drink replacement. Make each context explicit and keep the final task a hard beginner comment bonus.
Audience: English-speaking adults learning practical beginner Korean
Level: Beginner: two easy, two medium and two relatively hard questions, with polite requests and simple ingredient questions

Render readiness: **READY**

## Validation failures

None.

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. Human review is required.

## 1. cafe-dessert-04-q1 — easy

Scenario: At a dessert counter
Prompt: Ask the server for a menu.
Context: You want to look at the dessert list.

- **A** 메뉴판 좀 주세요. — menyupan jom juseyo.
- **B** 포크 좀 주세요. — pokeu jom juseyo.
- **C** 케이크 좀 주세요. — keikeu jom juseyo.

Private correct answer: **A**
Meaning: The menu, please.
Explanation: This is a polite request for the menu. 주세요 is a useful way to ask someone to give you something.
Teaching point: 메뉴판 = menu; 주세요 = please give me

## 2. cafe-dessert-04-q2 — easy

Scenario: Ordering cake
Prompt: Order one slice of cake.
Context: You want exactly one slice, not a whole cake.

- **A** 케이크 한 조각 주세요. — keikeu han jojak juseyo.
- **B** 쿠키 한 개 주세요. — kuki han gae juseyo.
- **C** 케이크 두 조각 주세요. — keikeu du jojak juseyo.

Private correct answer: **A**
Meaning: One slice of cake, please.
Explanation: This asks for one slice of cake. 한 조각 means one piece or slice.
Teaching point: 한 조각 = one slice; 주세요 = please give me

## 3. cafe-dessert-04-q3 — medium

Scenario: Eating cake
Prompt: Ask for a fork.
Context: You need a fork to eat your cake.

- **A** 포크 하나 주세요. — pokeu hana juseyo.
- **B** 숟가락 하나 주세요. — sutgarak hana juseyo.
- **C** 냅킨 하나 주세요. — naepkin hana juseyo.

Private correct answer: **A**
Meaning: One fork, please.
Explanation: This politely requests one fork. 하나 means one when counting an item.
Teaching point: 포크 = fork; 하나 = one; 주세요 = please give me

## 4. cafe-dessert-04-q4 — medium

Scenario: Sharing dessert
Prompt: Ask for one extra plate.
Context: You are sharing a cake slice and need another plate.

- **A** 접시 하나 더 주세요. — jeopsi hana deo juseyo.
- **B** 포크 하나 더 주세요. — pokeu hana deo juseyo.
- **C** 냅킨 하나 더 주세요. — naepkin hana deo juseyo.

Private correct answer: **A**
Meaning: One more plate, please.
Explanation: This requests an additional plate. 하나 더 means one more.
Teaching point: 접시 = plate; 하나 더 = one more

## 5. cafe-dessert-04-q5 — hard

Scenario: Checking ingredients
Prompt: Ask whether this dessert contains nuts.
Context: You have chosen a dessert and want to check its ingredients.

- **A** 이 디저트에 견과류가 들어가요? — i dijeoteue gyeongwallyuga deureogayo?
- **B** 이 디저트에 우유가 들어가요? — i dijeoteue uyuga deureogayo?
- **C** 이 디저트에 달걀이 들어가요? — i dijeoteue dalgyari deureogayo?

Private correct answer: **A**
Meaning: Does this dessert contain nuts?
Explanation: This asks whether the dessert contains nuts. The question pattern can be used to check whether an ingredient is included.
Teaching point: 견과류 = nuts; 들어가요? = is it included?

## 6. cafe-dessert-04-q6 — hard — COMMENT BONUS

Scenario: Choosing a dessert
Prompt: Ask which desserts are available without milk.
Context: You want a dessert made without milk and want to know the options.

- **A** 우유가 안 들어간 디저트는 뭐가 있어요? — uyuga an deureogan dijeoteuneun mwoga isseoyo?
- **B** 견과류 없는 디저트 있어요? — gyeongwallyu eomneun dijeoteu isseoyo?
- **C** 초콜릿 디저트 있어요? — chokollit dijeoteu isseoyo?

Private correct answer: **A**
Meaning: Which desserts are available without milk?
Explanation: This asks what desserts are available that do not contain milk. 안 들어간 describes something that is not included.
Teaching point: 우유가 안 들어간 = without milk; 뭐가 있어요? = what options are there?

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Kore; Korean voice: ko-KR-Chirp3-HD-Kore
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-6-luna; prompt phase5b-quality-v1
Generated: 2026-11-05T06:48:44.141Z; generation API cost estimate: $0.002339125 (not invoiced cost)
Reported token usage: \{"inputTokens":2177,"outputTokens":4134,"totalTokens":6311,"reasoningTokens":2588,"cachedInputTokens":0\}

Requested model: gpt-6-luna; returned model: gpt-6-luna; request ID: req\_baeb6b45c9d6448b9301d50ff302b3ae
Schema: phase5b-quality-education-v1; attempts: 1; pricing verified: 2026-11-04

- cafe-dessert-04-hook / hook / en-US: Can you say it in Korean?
- cafe-dessert-04-q1-question / question / en-US: How would you ask to see the menu?
- cafe-dessert-04-q1-answer / answer / ko-KR: 메뉴판 좀 주세요.
- cafe-dessert-04-q1-explanation / explanation / en-US: This is a polite way to ask for the menu. The ending means you’re asking someone to give you something.
- cafe-dessert-04-q2-question / question / en-US: What would you ask for?
- cafe-dessert-04-q2-answer / answer / ko-KR: 케이크 한 조각 주세요.
- cafe-dessert-04-q2-explanation / explanation / en-US: This asks for one slice of cake. The counting phrase means one piece or slice.
- cafe-dessert-04-q3-question / question / en-US: How can you politely request a fork?
- cafe-dessert-04-q3-answer / answer / ko-KR: 포크 하나 주세요.
- cafe-dessert-04-q3-explanation / explanation / en-US: This asks for one fork. The word for one comes before the polite request.
- cafe-dessert-04-q4-question / question / en-US: What would you ask the server to bring?
- cafe-dessert-04-q4-answer / answer / ko-KR: 접시 하나 더 주세요.
- cafe-dessert-04-q4-explanation / explanation / en-US: This asks for one additional plate. The phrase for “one more” is useful when requesting an extra item.
- cafe-dessert-04-q5-question / question / en-US: How would you check if nuts are in this dessert?
- cafe-dessert-04-q5-answer / answer / ko-KR: 이 디저트에 견과류가 들어가요?
- cafe-dessert-04-q5-explanation / explanation / en-US: This asks whether the dessert contains nuts. The question pattern is useful for checking whether an ingredient is included.
- cafe-dessert-04-q6-question / question / en-US: What could you ask to find the dessert options?
- cafe-dessert-04-q6-comment / comment / en-US: What do you think? Comment your answer\!
- cafe-dessert-04-q6-follow / follow / en-US: Follow for more Korean\!

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
