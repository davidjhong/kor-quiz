# PRIVATE content review — unapproved draft

Content hash: `c69b365a7d8d02d143c7df2929142a680dc392db3b8d0bd8b87416e32c871046`

Structural validation: **PASS**. Linguistic approval: **NOT GRANTED**.

Scenario brief: Visit a café with a friend: greet staff, order coffee, customize a drink, clear your cup, and request permission to charge a phone.
Audience: English-speaking adults learning beginner Korean
Level: Beginner: progress from greetings and quantities to location and permission questions

## Validation failures

None.

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. Human review is required.

## 1. cafe-greet-staff — easy

Scenario: Arriving at the café
Prompt: Greet the café staff politely.
Context: Say hello as you enter.

- **A** 안녕하세요. — annyeonghaseyo.
- **B** 안녕히 가세요. — annyeonghi gaseyo.
- **C** 잘 먹겠습니다. — jal meokgetseumnida.

Private correct answer: **A**
Meaning: Hello.
Explanation: 안녕하세요 is a polite greeting. Use it to say hello to the café staff.
Teaching point: 안녕하세요 = a polite hello

## 2. cafe-order-one-coffee — easy

Scenario: Ordering a drink
Prompt: Order one cup of coffee.
Context: Ask for exactly one coffee, not tea.

- **A** 커피 두 잔 주세요. — keopi du jan juseyo.
- **B** 차 한 잔 주세요. — cha han jan juseyo.
- **C** 커피 한 잔 주세요. — keopi han jan juseyo.

Private correct answer: **C**
Meaning: One coffee, please.
Explanation: 커피 한 잔 주세요 asks for one cup of coffee. 한 잔 is one cup; 두 잔 is two cups.
Teaching point: 한 잔 = one cup; 두 잔 = two cups

## 3. cafe-order-hot-coffee — medium

Scenario: Choosing a temperature
Prompt: Order a hot coffee.
Context: You do not want a cold drink or tea.

- **A** 차가운 커피 주세요. — chagaun keopi juseyo.
- **B** 따뜻한 커피 주세요. — ttatteuthan keopi juseyo.
- **C** 따뜻한 차 주세요. — ttatteuthan cha juseyo.

Private correct answer: **B**
Meaning: Hot coffee, please.
Explanation: 따뜻한 커피 주세요 requests warm or hot coffee. 차가운 means cold; 차 is tea.
Teaching point: 따뜻한 = warm; 차가운 = cold

## 4. cafe-add-milk — medium

Scenario: Adding milk
Prompt: Ask for milk in your coffee.
Context: Add milk, rather than sugar.

- **A** 설탕 넣어 주세요. — seoltang neoeo juseyo.
- **B** 우유 빼 주세요. — uyu ppae juseyo.
- **C** 우유 넣어 주세요. — uyu neoeo juseyo.

Private correct answer: **C**
Meaning: Add milk, please.
Explanation: 우유 is milk. 넣어 주세요 asks to add it; 빼 주세요 asks to leave it out.
Teaching point: 우유 = milk; 넣어 주세요 = please add

## 5. cafe-place-empty-cup — hard

Scenario: Clearing your table
Prompt: Ask where to put your empty cup.
Context: You have finished your drink.

- **A** 컵은 어디에 놓으면 돼요? — keobeun eodie noeumyeon dwaeyo?
- **B** 컵은 얼마예요? — keobeun eolmayeyo?
- **C** 컵을 하나 더 주세요. — keobeul hana deo juseyo.

Private correct answer: **A**
Meaning: Where should I put the cup?
Explanation: 어디에 means ‘where.’ The full question asks where you should put the cup.
Teaching point: 어디에 = where; 컵은 어디에 놓으면 돼요? = Where should I put the cup?

## 6. cafe-charge-phone — hard — COMMENT BONUS

Scenario: Requesting permission
Prompt: Ask if you may charge your phone.
Context: Request permission to use the café outlet.

- **A** 여기서 사진 찍어도 돼요? — yeogiseo sajin jjigeodo dwaeyo?
- **B** 여기서 충전해도 돼요? — yeogiseo chungjeonhaedo dwaeyo?
- **C** 여기서 전화해도 돼요? — yeogiseo jeonhwahaedo dwaeyo?

Private correct answer: **B**
Meaning: May I charge my phone here?
Explanation: 충전 means charging. 해도 돼요? asks permission. The other choices ask about taking photos or making a call.
Teaching point: 충전해도 돼요? asks permission to charge.

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Kore; Korean voice: ko-KR-Chirp3-HD-Kore
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: local-authoring / model none; prompt phase5-local-v1
Generated: 2026-11-05T01:50:21.157Z; additional generation API cost estimate: $0; reported API usage: none

- friends-hook-en / hook / en-US: Can you order in Korean?
- friends-greet-question / question / en-US: How would you greet the café staff?
- friends-greet-answer / answer / ko-KR: 안녕하세요.
- friends-greet-explanation / explanation / en-US: Hello. A polite greeting when you enter.
- friends-one-question / question / en-US: How would you order one coffee?
- friends-one-answer / answer / ko-KR: 커피 한 잔 주세요.
- friends-one-explanation / explanation / en-US: One coffee, please. Use this counter when ordering cups of a drink.
- friends-hot-question / question / en-US: How would you ask for a hot coffee?
- friends-hot-answer / answer / ko-KR: 따뜻한 커피 주세요.
- friends-hot-explanation / explanation / en-US: Hot coffee, please. This specifies the drink’s temperature.
- friends-milk-question / question / en-US: How would you ask them to add milk?
- friends-milk-answer / answer / ko-KR: 우유 넣어 주세요.
- friends-milk-explanation / explanation / en-US: Add milk, please. You can use this request to customize your drink.
- friends-cup-question / question / en-US: You’ve finished your drink. How would you ask where to leave your cup?
- friends-cup-answer / answer / ko-KR: 컵은 어디에 놓으면 돼요?
- friends-cup-explanation / explanation / en-US: Where should I put the cup? A useful question when clearing your table.
- friends-bonus-question / question / en-US: How would you ask permission to charge your phone here?
- friends-bonus-comment / comment / en-US: What do you think? Comment your answer\!
- friends-bonus-follow / follow / en-US: Follow for more Korean\!

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
