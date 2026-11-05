# PRIVATE content review — unapproved draft

Content hash: `5824a3b5d7a0ab035459f435d2e120ce376ee47e52a38909c95bb34d0fedcfbc`

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

## 1. public-transit-02-q1 — easy

Scenario: At the subway entrance
Prompt: Ask where the subway entrance is.
Context: You are at the station and need to enter the subway.

- **A** 지하철 입구가 어디예요? — jihacheol ipguga eodiyeyo?
- **B** 화장실은 어디예요? — hwajangsireun eodiyeyo?
- **C** 출구는 어디예요? — chulguneun eodiyeyo?

Private correct answer: **A**
Meaning: Where is the subway entrance?
Explanation: This asks where the subway entrance is. 어디예요? is a polite way to ask where something is.
Teaching point: 지하철 입구 = subway entrance; 어디예요? = where is it?

## 2. public-transit-02-q2 — easy

Scenario: Finding the platform
Prompt: Ask where the platform is.
Context: You need to find the platform before boarding.

- **A** 승강장은 어디예요? — seunggangjangeun eodiyeyo?
- **B** 출구는 어디예요? — chulguneun eodiyeyo?
- **C** 매표소는 어디예요? — maepyosomeun eodiyeyo?

Private correct answer: **A**
Meaning: Where is the platform?
Explanation: This asks where the platform is. The topic marker 은 attaches to 승강장 to make it the subject of the question.
Teaching point: 승강장 = platform; 은 어디예요? = where is it?

## 3. public-transit-02-q3 — medium

Scenario: Buying a ticket
Prompt: Ask where you can buy a ticket.
Context: You need to buy a ticket at the station.

- **A** 표는 어디에서 사요? — pyoneun eodieseo sayo?
- **B** 표는 어디에서 받아요? — pyoneun eodieseo badayo?
- **C** 표는 어디에서 확인해요? — pyoneun eodieseo hwaginhaeyo?

Private correct answer: **A**
Meaning: Where can I buy a ticket?
Explanation: This asks where to buy a ticket. 사요 means “buy,” while 받아요 means “receive.”
Teaching point: 표 = ticket; 어디에서 = where; 사요 = buy

## 4. public-transit-02-q4 — medium

Scenario: Checking a train's destination
Prompt: Ask if this train goes to Seoul Station.
Context: You need to confirm whether this train goes to Seoul Station.

- **A** 이 열차는 서울역에 가요? — i yeolchaneun seoullyeoge gayo?
- **B** 이 열차는 부산에 가요? — i yeolchaneun busane gayo?
- **C** 이 열차는 공항에 가요? — i yeolchaneun gonghange gayo?

Private correct answer: **A**
Meaning: Does this train go to Seoul Station?
Explanation: This asks whether the train goes to Seoul Station. 에 marks the destination in this sentence.
Teaching point: 서울역에 = to Seoul Station; 가요? = does it go?

## 5. public-transit-02-q5 — hard

Scenario: Changing trains
Prompt: Ask which station to transfer at.
Context: Your route requires a train change, and you need the station name.

- **A** 어느 역에서 갈아타요? — eoneu yeogeseo garatayo?
- **B** 어느 역에서 내려요? — eoneu yeogeseo naeryeoyo?
- **C** 어느 역에서 타요? — eoneu yeogeseo tayo?

Private correct answer: **A**
Meaning: Which station do I transfer at?
Explanation: This asks which station to transfer at. 갈아타요 means to change or transfer to another train.
Teaching point: 어느 역에서 = at which station; 갈아타요 = transfer

## 6. public-transit-02-q6 — hard — COMMENT BONUS

Scenario: Choosing a station exit
Prompt: Ask which exit to use for City Hall.
Context: You are going to City Hall and want to know which exit to use.

- **A** 시청에 가려면 몇 번 출구로 나가요? — sicheong-e garyeomyeon myeot beon chulguro nagayo?
- **B** 공원에 가려면 몇 번 출구로 나가요? — gongwon-e garyeomyeon myeot beon chulguro nagayo?
- **C** 은행에 가려면 몇 번 출구로 나가요? — eunhaeng-e garyeomyeon myeot beon chulguro nagayo?

Private correct answer: **A**
Meaning: Which exit should I take to get to City Hall?
Explanation: This asks which exit to use to get to City Hall. 가려면 means “if you want to go,” and 몇 번 asks for a number.
Teaching point: 시청에 = to City Hall; 몇 번 출구 = which exit number; 나가요? = do I exit?

## Exact planned narration (private review)

Voice provider/model: google-cloud-tts / chirp3-hd
English voice: en-US-Chirp3-HD-Kore; Korean voice: ko-KR-Chirp3-HD-Kore
Settings: rate 1, LINEAR16, 24000 Hz

Draft provenance: openai / model gpt-6-luna; prompt phase5b-quality-v1
Generated: 2026-11-05T06:52:47.447Z; generation API cost estimate: $0.002880125 (not invoiced cost)
Reported token usage: \{"inputTokens":2161,"outputTokens":5220,"totalTokens":7381,"reasoningTokens":3491,"cachedInputTokens":1370\}

Requested model: gpt-6-luna; returned model: gpt-6-luna; request ID: req\_7354966aa34c41de8e08666b76cf591d
Schema: phase5b-quality-education-v1; attempts: 1; pricing verified: 2026-11-04

- public-transit-02-hook / hook / en-US: Can you say it in Korean?
- public-transit-02-q1-question / question / en-US: You’re at the station. How would you ask where to enter the subway?
- public-transit-02-q1-answer / answer / ko-KR: 지하철 입구가 어디예요?
- public-transit-02-q1-explanation / explanation / en-US: This asks where the subway entrance is. Use this polite question pattern when you need to locate a place.
- public-transit-02-q2-question / question / en-US: You’re ready to board, but need directions. What would you ask?
- public-transit-02-q2-answer / answer / ko-KR: 승강장은 어디예요?
- public-transit-02-q2-explanation / explanation / en-US: This asks where the platform is. The ending is a polite way to ask about the location of a place.
- public-transit-02-q3-question / question / en-US: You need a ticket before traveling. What would you ask the station worker?
- public-transit-02-q3-answer / answer / ko-KR: 표는 어디에서 사요?
- public-transit-02-q3-explanation / explanation / en-US: This asks where you can buy a ticket. The verb here means “buy,” so it’s useful when asking where to purchase something.
- public-transit-02-q4-question / question / en-US: You’re not sure about the destination. How would you check where this train goes?
- public-transit-02-q4-answer / answer / ko-KR: 이 열차는 서울역에 가요?
- public-transit-02-q4-explanation / explanation / en-US: This asks whether the train goes to Seoul Station. The particle after a place name can mark the destination.
- public-transit-02-q5-question / question / en-US: You need to change trains along the way. How would you ask which station to use?
- public-transit-02-q5-answer / answer / ko-KR: 어느 역에서 갈아타요?
- public-transit-02-q5-explanation / explanation / en-US: This asks which station you should transfer at. The verb means to change from one train to another.
- public-transit-02-q6-question / question / en-US: You’re heading to City Hall. How would you ask which exit to take?
- public-transit-02-q6-comment / comment / en-US: What do you think? Comment your answer\!
- public-transit-02-q6-follow / follow / en-US: Follow for more Korean\!

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
