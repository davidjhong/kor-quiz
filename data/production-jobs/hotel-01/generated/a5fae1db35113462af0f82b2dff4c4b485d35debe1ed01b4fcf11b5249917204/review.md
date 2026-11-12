# PRIVATE automated development review

Content hash: `c519daeaf626938596b948906210b50527fd074af6e94f4969d7eab9f25caa4d`

Structural validation: **PASS**. Mode: **AUTOMATED DEVELOPMENT**. Human review: **NOT CLAIMED**.

Scenario brief: Beginner Korean at a hotel
Audience: English-speaking adults learning practical beginner Korean for travel
Level: Beginner: two easy, two medium and two hard questions, with the sixth as the unanswered comment bonus

Render readiness: **READY**

## Validation failures

None.

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. A separate manual or automated linguistic review is required.

## Learning plan

Context: A traveler with a reservation checks in, makes simple requests, gets help with hotel facilities, and asks staff about a checkout-related need.

1. Tell hotel staff politely that you would like to check in.
2. Request one additional towel.
3. Ask for the hotel Wi-Fi password.
4. Ask where the elevator is.
5. Report a key card problem and ask staff to check it.
6. Ask permission to leave luggage after checking out.

## 1. production-hotel-01-q1 — easy

Scenario: At hotel check-in
Prompt: Tell the front desk you want to begin your stay. What would you say?
Context: You have a reservation and are speaking to the front desk on arrival.

- **A** 체크인하고 싶어요. — chekeuinhago sipeoyo.
- **B** 체크아웃하고 싶어요. — chekeuaut hago sipeoyo.
- **C** 엘리베이터가 어디예요? — ellibeiteoga eodiyeyo?

Private correct answer: **A**
Meaning: I'd like to check in.
Explanation: This politely expresses that you want to check in. 싶어요 means “want to” or “would like to.”
Teaching point: 체크인하고 싶어요 = I'd like to check in. 싶어요 = would like to

## 2. production-hotel-01-q2 — easy

Scenario: In your room
Prompt: Ask hotel staff for one additional towel.
Context: You are in your room and need one more towel.

- **A** 수건 하나 더 주세요. — sugeon hana deo juseyo.
- **B** 물 하나 더 주세요. — mul hana deo juseyo.
- **C** 담요 하나 더 주세요. — damyo hana deo juseyo.

Private correct answer: **A**
Meaning: One more towel, please.
Explanation: This asks politely for an additional towel. 더 means “more,” and 주세요 makes it a polite request.
Teaching point: 수건 = towel; 하나 더 = one more; 주세요 = please give me

## 3. production-hotel-01-q3 — medium

Scenario: Connecting to Wi-Fi
Prompt: Ask for the Wi-Fi password.
Context: You want to connect your phone to the hotel Wi-Fi but need its password.

- **A** 와이파이 비밀번호가 뭐예요? — waipai bimilbeonhoga mwoyeyo?
- **B** 조식은 몇 시예요? — josigeun myeot siyeyo?
- **C** 엘리베이터는 어디예요? — ellibeiteoneun eodiyeyo?

Private correct answer: **A**
Meaning: What is the Wi-Fi password?
Explanation: This asks for the Wi-Fi password. 뭐예요 means “what is it?” and 비밀번호 means “password.”
Teaching point: 와이파이 비밀번호 = Wi-Fi password; 뭐예요? = What is it?

## 4. production-hotel-01-q4 — medium

Scenario: Finding the elevator
Prompt: Ask where the elevator is.
Context: You are leaving your room and need to find the elevator.

- **A** 엘리베이터가 어디예요? — ellibeiteoga eodiyeyo?
- **B** 식당이 어디예요? — sigdangi eodiyeyo?
- **C** 방이 몇 층이에요? — bangi myeot cheungieyo?

Private correct answer: **A**
Meaning: Where is the elevator?
Explanation: This asks for the elevator's location. 어디예요 means “where is it?”
Teaching point: 엘리베이터 = elevator; 어디예요? = Where is it?

## 5. production-hotel-01-q5 — hard

Scenario: A key card problem
Prompt: Tell the front desk your key card won't open the door and ask for help.
Context: Your room door will not unlock with your key card.

- **A** 카드키가 안 돼요. 확인해 주세요. — kadeukiga an dwaeyo. hwaginhae juseyo.
- **B** 카드키를 잃어버렸어요. — kadeukireul ireobeoryeosseoyo.
- **C** 수건을 더 주세요. — sugeoneul deo juseyo.

Private correct answer: **A**
Meaning: The key card doesn't work. Please check it.
Explanation: This reports that the key card is not working and politely asks staff to check it. 확인해 주세요 means “please check.”
Teaching point: 안 돼요 = doesn't work; 확인해 주세요 = please check

## 6. production-hotel-01-q6 — hard — COMMENT BONUS

Scenario: After checkout
Prompt: Ask whether you may leave your luggage at the hotel after checking out.
Context: You have checked out and want to ask the front desk about leaving your luggage.

- **A** 체크아웃 후에 짐을 맡겨도 돼요? — chekeuaut hue jimeul matgyeodo dwaeyo?
- **B** 체크아웃 시간을 바꿔도 돼요? — chekeuaut siganeul bakkwodo dwaeyo?
- **C** 짐을 방으로 옮겨 주세요. — jimeul bang-euro omgyeo juseyo.

Private correct answer: **A**
Meaning: May I leave my luggage after checkout?
Explanation: This asks permission to leave luggage after checkout. 맡겨도 돼요? means “May I leave it?”
Teaching point: 체크아웃 후에 = after checkout; 짐을 맡겨도 돼요? = May I leave my luggage?

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Achird; Korean voice: ko-KR-Chirp3-HD-Achird
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-6-luna; prompt phase6-scenario-generation-v1
Generated: 2026-11-11T09:03:55.276Z; generation API cost estimate: $0.002473625 (not invoiced cost)
Reported token usage: \{"inputTokens":2317,"outputTokens":4368,"totalTokens":6685,"reasoningTokens":2545,"cachedInputTokens":0\}

Requested model: gpt-6-luna; returned model: gpt-6-luna; request ID: req\_f9cf48477d654cdca72b551b96a1e0d4
Schema: phase6-scenario-education-v1; attempts: 1; pricing verified: 2026-11-10

- production-hotel-01-hook / hook / en-US: Can you say it in Korean?
- production-hotel-01-q1-question / question / en-US: What could you say to let the front desk know you’re ready to start your stay?
- production-hotel-01-q1-answer / answer / ko-KR: 체크인하고 싶어요.
- production-hotel-01-q1-explanation / explanation / en-US: I'd like to check in. This is a polite way to tell someone what you want to do.
- production-hotel-01-q2-question / question / en-US: How would you politely ask for an extra towel?
- production-hotel-01-q2-answer / answer / ko-KR: 수건 하나 더 주세요.
- production-hotel-01-q2-explanation / explanation / en-US: One more towel, please. The phrase for “one more” specifies that you need an additional towel.
- production-hotel-01-q3-question / question / en-US: What would you ask when you need the password to get online?
- production-hotel-01-q3-answer / answer / ko-KR: 와이파이 비밀번호가 뭐예요?
- production-hotel-01-q3-explanation / explanation / en-US: What is the Wi-Fi password? This question asks for the password, rather than the network name.
- production-hotel-01-q4-question / question / en-US: How would you ask someone to point you to the elevator?
- production-hotel-01-q4-answer / answer / ko-KR: 엘리베이터가 어디예요?
- production-hotel-01-q4-explanation / explanation / en-US: Where is the elevator? The question ending turns a location phrase into a polite question.
- production-hotel-01-q5-question / question / en-US: What could you say to report the card problem and ask staff to check it?
- production-hotel-01-q5-answer / answer / ko-KR: 카드키가 안 돼요. 확인해 주세요.
- production-hotel-01-q5-explanation / explanation / en-US: The key card doesn't work. Please check it. This combines a polite problem report with a request for help.
- production-hotel-01-q6-question / question / en-US: How would you ask the front desk if you may leave your bags there after checkout?
- production-hotel-01-q6-comment / comment / en-US: What do you think? Comment your answer\!
- production-hotel-01-q6-follow / follow / en-US: Follow for more Korean\!

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
