# PRIVATE content review — unapproved draft

Content hash: `da7dadc5ea01626898092490c11408bcd37590eed4b53c6e5c680608a6beb7e2`

Structural validation: **PASS**. Linguistic approval: **NOT GRANTED**.

Scenario brief: Ask a station worker for help using public transit: locate the subway entrance, ask where to buy a ticket, find a platform, check whether a train goes to Seoul Station, ask where to transfer, and ask which exit to use for a named destination. State destinations and context clearly without asserting real route information. Keep the final exit question as the hard beginner comment bonus.
Audience: English-speaking adults learning practical beginner Korean for travel
Level: Beginner: two easy location questions, two medium service or destination questions, two harder transfer or exit questions

Render readiness: **BLOCKED**
- Matching approved background missing for public-transit; content review may proceed

## Validation failures

None.

## Warnings and repetition/ambiguity review

- Structural validation does not establish Korean accuracy, naturalness, difficulty or semantic answer uniqueness. Human review is required.

## 1. public-transit-01-q1 — easy

Scenario: Locating the subway entrance
Prompt: Where is the subway entrance?
Context: Ask the station staff politely for directions.

- **A** 지하철 입구가 어디예요? — jihacheol ipgu ga eodiyeoyo?
- **B** 지하철 표를 어디서 사요? — jihacheol pyoreul eodiseo sayo?
- **C** 전철 시간표 알려 주세요. — jeoncheol siganpyo allyeo juseyo.

Private correct answer: **A**
Meaning: Where is the subway entrance?
Explanation: A polite way to ask for the entrance location.
Teaching point: Where is the entrance? 입구가 어디예요? means asking for a location.

## 2. public-transit-01-q2 — easy

Scenario: Locating a ticket counter
Prompt: Where can I buy a ticket for the subway?
Context: Ask where to buy a ticket.

- **A** 티켓은 어디에서 살 수 있어요? — tikes eun eodieseo sal su isseoyo?
- **B** 표를 어디서 사요? — pyoreul eodiseo sayo?
- **C** 역에서 표를 살 수 없어요. — yeokeseo pyoreul sal su eopseoyo.

Private correct answer: **B**
Meaning: Where can I buy a ticket?
Explanation: Ask for the location to purchase a ticket.
Teaching point: 표를 사다 = buy a ticket; 어디서 살 수 있어요 = where can I buy it.

## 3. public-transit-01-q3 — medium

Scenario: Finding a platform
Prompt: Which platform is for the next train to City Center?
Context: Ask about the correct platform.

- **A** 다음 열차는 도시센터로 가는 플랫폼이 어디예 — da-eum yeolcha neun dosi senteoro ganeun peullatepom i eodiya?
- **B** 다음 열차는 도시센터로 가나요? — da-eum yeolcha neun dosi senteoro ganayo?
- **C** 도시센터로 가는 플랫폼이 몇 번호예요? — dosi senteoro ganeun peullatpom i myeot beon-eyo?

Private correct answer: **A**
Meaning: Which platform is for City Center?
Explanation: This asks for the correct platform number for a specific destination.
Teaching point: Platform numbers are shown on signs; use 어느 플랫폼이요? for quick questions.

## 4. public-transit-01-q4 — medium

Scenario: Checking train destination
Prompt: Does this train go to Seoul Station?
Context: Confirm train destination politely.

- **A** 이 열차가 서울역으로 가나요? — i yeolchaga seouldyeog-euro ganayo?
- **B** 서울역으로 가려면 어떻게 해요? — seouldyeog-euro garyeomyeon eotteoke haeyo?
- **C** 서울역에 도착하나요? — seouldyeog-e dochakhanayo?

Private correct answer: **A**
Meaning: Does this train go to Seoul Station?
Explanation: Ask whether the current train is bound for Seoul Station.
Teaching point: Go to + destination to ask about final stop.

## 5. public-transit-01-q5 — hard

Scenario: Transfer information
Prompt: Where should I transfer to reach my next point?
Context: Ask for the transfer point politely.

- **A** 다음 목적지로 가려면 어디에서 환승해요? — da-eum mokpogjiro garyeomyeon eodieseon hwanseonghaeyo?
- **B** 다음 역에서 환승해요? — da-eum yeog eseo hwanseonghaeyo?
- **C** 환승은 필요 없어요. — hwanseongeun piryoh eopseoyo.

Private correct answer: **A**
Meaning: Where should I transfer to reach my next destination?
Explanation: Ask for the best transfer point for the next leg.
Teaching point: 환승 = transfer; 어떤 역에서 환승해요 = at which station do you transfer.

## 6. public-transit-01-q6 — hard — COMMENT BONUS

Scenario: Final exit choice for a named place
Prompt: Which exit should I take to reach City Hall?
Context: Public transit with a named destination; final exit choice.

- **A** 시청으로 가려면 어떤 출구로 가야 해요? — sicheongeo garyeomyeon eotteon chulgu ro gayahayo?
- **B** 시청 방향으로 맞는 출구가 어디예요? — sicheong banghyangeun ano go chulgu gae?
- **C** 시청으로 가는 가장 가까운 출구는 어디예요? — sicheongeo ganeun gakkawun chulgu neun eodiyeyo?

Private correct answer: **C**
Meaning: Which exit is closest to City Hall?
Explanation: Exit choices can vary; choose the one closest to City Hall to save time.
Teaching point: 출구 = exit; 가장 가까운 출구 = the closest exit.

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Kore; Korean voice: ko-KR-Chirp3-HD-Kore
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-5-nano-2025-08-07; prompt phase5b-v4
Generated: 2026-11-05T06:08:57.169Z; generation API cost estimate: $0.0018831 (not invoiced cost)
Reported token usage: \{"inputTokens":3115,"outputTokens":1946,"totalTokens":5061,"reasoningTokens":576,"cachedInputTokens":0\}

Requested model: gpt-5-nano-2025-08-07; returned model: gpt-5-nano-2025-08-07; request ID: req\_20cf833c14384774b63de1a0e9ff2dd5
Schema: phase5b-education-v4; attempts: 2; pricing verified: 2026-11-04

- public-transit-01-hook / hook / en-US: Can you say it in Korean?
- public-transit-01-q1-question / question / en-US: How would you ask where the subway entrance is?
- public-transit-01-q1-answer / answer / ko-KR: 지하철 입구가 어디예요?
- public-transit-01-q1-explanation / explanation / en-US: Ask for the location of a place using a standard location question with polite ending.
- public-transit-01-q2-question / question / en-US: Where can I buy a subway ticket?
- public-transit-01-q2-answer / answer / ko-KR: 표를 어디서 사요?
- public-transit-01-q2-explanation / explanation / en-US: Ask where tickets are sold in a polite way without using Korean words in the narration.
- public-transit-01-q3-question / question / en-US: Which platform should I go to for the next train to City Center?
- public-transit-01-q3-answer / answer / ko-KR: 다음 열차는 도시센터로 가는 플랫폼이 어디예
- public-transit-01-q3-explanation / explanation / en-US: Ask which platform to avoid missing the train.
- public-transit-01-q4-question / question / en-US: Does this train go to Seoul Station?
- public-transit-01-q4-answer / answer / ko-KR: 이 열차가 서울역으로 가나요?
- public-transit-01-q4-explanation / explanation / en-US: Check the train’s final stop to confirm your destination.
- public-transit-01-q5-question / question / en-US: Where should I transfer to reach my next destination?
- public-transit-01-q5-answer / answer / ko-KR: 다음 목적지로 가려면 어디에서 환승해요?
- public-transit-01-q5-explanation / explanation / en-US: Ask for the transfer point to continue your journey efficiently.
- public-transit-01-q6-question / question / en-US: Which exit should I take to reach City Hall?
- public-transit-01-q6-comment / comment / en-US: What do you think? Comment your answer\!
- public-transit-01-q6-follow / follow / en-US: Follow for more Korean\!

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
