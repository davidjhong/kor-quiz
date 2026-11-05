# PRIVATE content review — unapproved draft

Content hash: `069b7be1600f41ea9b78e58dd34a59f968d53837993c276455317000d53f806a`

Structural validation: **PASS**. Linguistic approval: **NOT GRANTED**.

Scenario brief: Buying a snack and a ready meal at a convenience store: ask for a shopping bag, request chopsticks, ask staff to heat food, ask whether card payment is possible, locate an item, and ask whether a smaller size is available. Each question should make the requested item or service explicit. Use distinct tasks, and make the last permission or availability question the hard comment bonus.
Audience: English-speaking adults learning practical beginner Korean
Level: Beginner: progress from short polite requests to location and availability questions; two easy, two medium, two hard

Render readiness: **BLOCKED**
- Matching approved background missing for convenience-store; content review may proceed

## Validation failures

None.

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. Human review is required.

## 1. convenience-store-02-q1 — easy

Scenario: At the checkout
Prompt: You need one shopping bag. What do you say?
Context: You are paying and want the cashier to give you a bag.

- **A** 봉투 하나 주세요. — beontu hana juseyo.
- **B** 젓가락 하나 주세요. — jjeotgarak hana juseyo.
- **C** 물 한 병 주세요. — mul han byeong juseyo.

Private correct answer: **A**
Meaning: One shopping bag, please.
Explanation: This politely asks for one shopping bag. 하나 means “one,” and 주세요 is a polite way to ask for something.
Teaching point: 봉투 = bag; 하나 = one; 주세요 = please give me

## 2. convenience-store-02-q2 — easy

Scenario: With a ready meal
Prompt: You need chopsticks for your meal. What do you say?
Context: You have a ready meal but no chopsticks.

- **A** 젓가락 주세요. — jjeotgarak juseyo.
- **B** 숟가락 주세요. — sutgarak juseyo.
- **C** 냅킨 주세요. — naepkin juseyo.

Private correct answer: **A**
Meaning: Chopsticks, please.
Explanation: This asks for chopsticks. 숟가락 means “spoon,” while 냅킨 means “napkin”; 주세요 politely asks for the item.
Teaching point: 젓가락 = chopsticks; 주세요 = please give me

## 3. convenience-store-02-q3 — medium

Scenario: Heating a lunchbox
Prompt: Ask the staff to heat your lunchbox. What do you say?
Context: You bought a ready-to-eat lunchbox and want it warmed.

- **A** 이 도시락 데워 주세요. — i dosirak dewo juseyo.
- **B** 이 도시락 포장해 주세요. — i dosirak pojanghae juseyo.
- **C** 이 도시락 하나 더 주세요. — i dosirak hana deo juseyo.

Private correct answer: **A**
Meaning: Please heat this lunchbox.
Explanation: This asks the staff to heat the lunchbox. 데워 means “heat” here, and 주세요 turns the request into a polite one.
Teaching point: 이 도시락 = this lunchbox; 데워 주세요 = please heat it

## 4. convenience-store-02-q4 — medium

Scenario: At the register
Prompt: Ask if you can pay by card. What do you say?
Context: You are ready to pay and want to know if the store accepts cards.

- **A** 카드로 결제해도 돼요? — kadeuro gyeoljehaedo dwaeyo?
- **B** 현금으로 결제해도 돼요? — hyeongeumeuro gyeoljehaedo dwaeyo?
- **C** 카드로 결제할게요. — kadeuro gyeoljehalgeyo.

Private correct answer: **A**
Meaning: Can I pay by card?
Explanation: This asks whether paying by card is allowed. The question ending asks about possibility or permission; the cash option asks about a different payment method.
Teaching point: 카드로 = by card; 결제해도 돼요? = is it okay to pay?

## 5. convenience-store-02-q5 — hard

Scenario: Finding an item
Prompt: Ask where the ramen is. What do you say?
Context: You are in the store and cannot find the ramen on the shelves.

- **A** 라면은 어디에 있어요? — ramyeoneun eodie isseoyo?
- **B** 과자는 어디에 있어요? — gwajaneun eodie isseoyo?
- **C** 음료는 어디에 있어요? — eumnyoneun eodie isseoyo?

Private correct answer: **A**
Meaning: Where is the ramen?
Explanation: This asks where the ramen is. 어디에 있어요? means “Where is it?”; the first word names the item you are looking for.
Teaching point: 라면은 = as for the ramen; 어디에 있어요? = where is it?

## 6. convenience-store-02-q6 — hard — COMMENT BONUS

Scenario: Choosing a snack size
Prompt: Ask if this snack comes in a smaller size. What do you say?
Context: The package is too large, and you want a smaller size of the same snack.

- **A** 더 작은 사이즈도 있어요? — deo jageun saijeudo isseoyo?
- **B** 더 큰 사이즈도 있어요? — deo keun saijeudo isseoyo?
- **C** 다른 맛도 있어요? — dareun matdo isseoyo?

Private correct answer: **A**
Meaning: Do you also have a smaller size?
Explanation: This asks whether the same snack is available in a smaller size. 더 작은 means “smaller,” and 있어요? asks whether something is available.
Teaching point: 더 작은 = smaller; 사이즈도 있어요? = is there also a size?

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Kore; Korean voice: ko-KR-Chirp3-HD-Kore
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-6-luna; prompt phase5b-quality-v1
Generated: 2026-11-05T06:49:52.136Z; generation API cost estimate: $0.001900875 (not invoiced cost)
Reported token usage: \{"inputTokens":2163,"outputTokens":3261,"totalTokens":5424,"reasoningTokens":1509,"cachedInputTokens":1370\}

Requested model: gpt-6-luna; returned model: gpt-6-luna; request ID: req\_3222629f3937495e8b41a09b8d7b9189
Schema: phase5b-quality-education-v1; attempts: 1; pricing verified: 2026-11-04

- convenience-store-02-hook / hook / en-US: Can you say it in Korean?
- convenience-store-02-q1-question / question / en-US: You need a bag for your purchases. How would you ask for one?
- convenience-store-02-q1-answer / answer / ko-KR: 봉투 하나 주세요.
- convenience-store-02-q1-explanation / explanation / en-US: This means, “One shopping bag, please.” The word for “one” comes before the item, and the ending makes it a polite request.
- convenience-store-02-q2-question / question / en-US: Your meal has no chopsticks. What could you ask the staff for?
- convenience-store-02-q2-answer / answer / ko-KR: 젓가락 주세요.
- convenience-store-02-q2-explanation / explanation / en-US: This means, “Chopsticks, please.” You can put the item you want before a polite phrase for asking someone to give it to you.
- convenience-store-02-q3-question / question / en-US: You want your lunchbox warmed before you eat. How would you ask?
- convenience-store-02-q3-answer / answer / ko-KR: 이 도시락 데워 주세요.
- convenience-store-02-q3-explanation / explanation / en-US: This means, “Please heat this lunchbox.” The verb “heat” comes before the polite request ending.
- convenience-store-02-q4-question / question / en-US: You are at the register and want to check whether card payment is possible. What would you ask?
- convenience-store-02-q4-answer / answer / ko-KR: 카드로 결제해도 돼요?
- convenience-store-02-q4-explanation / explanation / en-US: This means, “Can I pay by card?” The question asks whether an action is okay, rather than simply stating what you plan to do.
- convenience-store-02-q5-question / question / en-US: You cannot spot the ramen. How would you ask where it is?
- convenience-store-02-q5-answer / answer / ko-KR: 라면은 어디에 있어요?
- convenience-store-02-q5-explanation / explanation / en-US: This means, “Where is the ramen?” The question phrase means “Where is it?” Put the item you are looking for first.
- convenience-store-02-q6-question / question / en-US: This package is too big for you. How would you ask whether there is a smaller size?
- convenience-store-02-q6-comment / comment / en-US: What do you think? Comment your answer\!
- convenience-store-02-q6-follow / follow / en-US: Follow for more Korean\!

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
