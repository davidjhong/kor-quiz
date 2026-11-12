import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {getComparisonTimeline} from '../src/comparison.ts';
import {draftToQuiz} from '../src/draftSchema.ts';
import {getIllustratedQuestionState} from '../src/questionTiming.ts';
import {getDisplayBackgroundMotion,getDisplayEntrance,getBonusPanelOpacity} from '../src/displayBookends.ts';
const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const draft=json('drafts/public-transit-02-candidate/draft.json'),quiz=draftToQuiz(draft);
const selected=['hook','comment','follow'];
const full=json('public/audio/public-transit-02/manifest.json');
const narration={...full,clips:full.clips.filter(c=>selected.includes(c.role)||c.contentId===quiz.questions[2].id)};
const reference=full.clips.find(c=>c.contentId===quiz.questions.at(-1).id&&c.role==='question');
const reading=Math.max(120,6+Math.ceil(reference.durationSeconds*30)+15);
const old=getComparisonTimeline(quiz,2,narration),t=getComparisonTimeline(quiz,2,narration,reading);
test('visual-only bonus preserves normal question timing and adds full reading/countdown without invented speech',()=>{
  assert.deepEqual(t.question,old.question);assert.equal(reading,151);
  assert.equal(t.bonus.countdownStart-t.bonus.start,reading);
  assert.equal(t.bonus.revealStart-t.bonus.countdownStart,150);
  assert.equal(t.ending.commentStart,t.bonus.revealStart+6);
  assert.equal(t.durationInFrames-old.durationInFrames,reading+150);
  assert.equal(t.ending.followStart-t.ending.commentEnd,45);
  assert.equal(t.ending.end-t.ending.followEnd,30);assert.equal(t.durationInFrames-t.ending.end,12);
  assert.deepEqual(t.audio.map(c=>c.role),['hook','question','answer','explanation','comment','follow']);
  assert(!t.audio.some(c=>c.contentId===quiz.questions.at(-1).id&&['question','answer','explanation'].includes(c.role)));
  for(let i=1;i<t.audio.length;i++)assert(t.audio[i].start>=t.audio[i-1].end);
  assert.throws(()=>getComparisonTimeline(quiz,2,narration,119),/Invalid/u);
});
test('bonus scene never enters reveal and remains visible throughout comment speech',()=>{
  for(let frame=0;frame<t.bonus.questionTimeline.durationInFrames;frame++)
    assert.notEqual(getIllustratedQuestionState(frame,true,t.bonus.questionTimeline).phase,'reveal');
  assert.equal(getBonusPanelOpacity(t.ending.commentEnd-1,t.ending.followStart),1);
  assert.equal(getBonusPanelOpacity(t.ending.followStart,t.ending.followStart),0);
});
test('background movement covers the frame, freezes for questions and has no boundary jump',()=>{
  const motion=f=>getDisplayBackgroundMotion(f,t.opening.end,t.ending.commentStart,t.durationInFrames);
  for(let f=0;f<t.durationInFrames;f++){
    const m=motion(f),scale=1.02*m.extraScale;
    assert(Math.abs(m.x)<1080*(scale-1)/2);assert(m.y<=0);assert(m.y+1920*scale>=1920);
    if(f){const prior=motion(f-1);assert(Math.abs(m.extraScale-prior.extraScale)<.001);assert(Math.abs(m.x-prior.x)<.15);assert(Math.abs(m.y-prior.y)<.15);}
  }
  assert.deepEqual(motion(t.question.start),motion(t.bonus.countdownStart));
});
test('display entrances stay bounded and do not bounce or change position',()=>{
  for(let f=10;f<35;f++){const a=getDisplayEntrance(f,10);assert(a.opacity>0&&a.opacity<=1);assert(a.scale>=.95&&a.scale<=1);}
  assert.equal(getDisplayEntrance(16,10).opacity,1);assert.equal(getDisplayEntrance(16,10).scale,1);
});
