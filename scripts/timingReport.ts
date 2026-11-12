import type {getNarratedTimeline} from '../src/narrationTiming.ts';
export const timingReport=(t:ReturnType<typeof getNarratedTimeline>,advisory:readonly number[]|null=[75,85])=>{
  const frames:Record<string,number>={hookSpeech:0,hookHold:0,questionSpeech:0,readingOnly:0,countdown:0,answerSpeech:0,explanationSpeech:0,transitions:0,revealGapsAndHolds:0,ctaSpeech:0,ctaPauseAndHold:0,fade:0};
  for(let f=0;f<t.durationInFrames;f++){
    const speaking=t.audio.filter(a=>f>=a.start&&f<a.end);if(speaking.length>1)throw new Error('Overlapping narration in measured timeline');
    const a=speaking[0],q=t.questions.find(q=>f>=q.start&&f<q.end);
    if(a){if(q&&f>=q.countdownStart&&f<q.revealStart)throw new Error('Narration overlaps countdown');
      frames[a.role==='hook'?'hookSpeech':a.role==='question'?'questionSpeech':a.role==='answer'?'answerSpeech':a.role==='explanation'?'explanationSpeech':'ctaSpeech']++;}
    else if(f<t.openingEnd)frames.hookHold++;
    else if(!q)frames[f>=t.questions.at(-1)!.end?'fade':'transitions']++;
    else if(f<q.countdownStart)frames.readingOnly++;
    else if(f<q.revealStart)frames.countdown++;
    else frames[q.bonus?'ctaPauseAndHold':'revealGapsAndHolds']++;
  }
  return {frames,seconds:Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,v/30])),totalFrames:t.durationInFrames,totalSeconds:t.durationInFrames/30,
    minimumSeconds:65,minimumConflict:t.durationInFrames<65*30,advisory,advisoryConflict:advisory?t.durationInFrames<advisory[0]*30||t.durationInFrames>advisory[1]*30:false};
};
