"""Build the audition using actual A AAC and a gain-matched cached music stem.
The estimated post-master decomposition is explicitly diagnostic, not alignment
or a change to TTS. PCM rounding/codec differences are reported.
"""
import json, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
p=Path('out/checkpoint-b'); cfg=json.loads((p/'mix-timeline.json').read_text(encoding='utf-8')); sr=48000
def read(file):
    with wave.open(str(file),'rb') as w:
        assert w.getframerate()==sr and w.getnchannels()==2 and w.getsampwidth()==2
        return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float64).reshape(-1,2)/32768
actual=read(p/'actual-a-decoded.wav'); raw=read(Path('out/checkpoint-a/mix-preview-raw.wav')); music=read(p/'music-a-raw.wav'); speech=read(p/'speech-a-raw.wav')
n=min(map(len,[actual,raw,music]));speech=np.pad(speech,((0,max(0,n-len(speech))),(0,0)))
actual,raw,music,speech=[x[:n] for x in [actual,raw,music,speech]]
# Least-squares common gain in 10ms blocks. AAC has already removed priming.
# Smooth amplitude changes follow the actual final master; no words are retimed.
block=480; gains=[]; centers=[]; correlations=[]
for i in range(0,n,block):
    x=raw[i:i+block].reshape(-1);y=actual[i:i+block].reshape(-1);energy=np.dot(x,x)
    gains.append(np.dot(x,y)/energy if energy>1e-7 else (gains[-1] if gains else 1));centers.append(i+len(x)/4)
    if energy>1e-5 and np.dot(y,y)>1e-8:correlations.append(float(np.dot(x,y)/(np.linalg.norm(x)*np.linalg.norm(y))))
gain=np.interp(np.arange(n),centers,gains)[:,None]
music_a=music*gain
# Subtraction retains A's actual encoded speech/residual exactly in both sections.
speech_est=actual-music_a
factor=10**(3/20);b=speech_est+music_a*factor
start=round(cfg['window']['start']*sr);end=start+round(cfg['window']['duration']*sr)
# Same tiny boundary fades apply only in speech-free countdown/hold boundaries.
a=actual[start:end].copy();b=b[start:end].copy();assert len(a)==len(b)==round(13.4*sr); fade=np.ones(len(a));k=round(.08*sr);fade[:k]=np.linspace(0,1,k);fade[-k:]=np.linspace(1,0,k)
def save(file,x):
    assert np.max(np.abs(x))<1
    with wave.open(str(file),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes(np.rint(x*32767).astype('<i2').tobytes())
save(p/'music-a-master-estimate.wav',music_a)
save(p/'speech-a-master-estimate.wav',speech_est)
save(p/'comparison-preencode.wav',np.concatenate([a*fade[:,None],b*fade[:,None]]))
def rms(x):return float(20*np.log10(max(1e-12,np.sqrt(np.mean(x*x)))))
measure=[]
windows=[('countdown',8.2,12.1),('Korean answer',12.65,14.05),('English explanation',14.6,20.4)]
for label,s,e in windows:
    sl=slice(round(s*sr),round(e*sr));m=rms(music[sl]);v=rms(speech[sl]);mf=rms(music_a[sl]);vf=rms(speech_est[sl])
    measure.append(dict(section=label,start=s,end=e,rawMusicDbFS=m,rawNarrationDbFS=v,rawMusicMinusNarrationDb=m-v if label!='countdown' else None,estimatedFinalMusicADbFS=mf,estimatedFinalMusicBDbFS=mf+3,estimatedFinalNarrationDbFS=vf,estimatedMusicMinusNarrationA=mf-vf if label!='countdown' else None,estimatedMusicMinusNarrationB=mf+3-vf if label!='countdown' else None))
# Spectrum on the prepared music in the actual audition window (diagnostic only).
x=music[start:end].mean(axis=1);spectrum=np.abs(np.fft.rfft(x*np.hanning(len(x))))**2;freq=np.fft.rfftfreq(len(x),1/sr)
energy={name:float(spectrum[(freq>=lo)&(freq<hi)].sum()/spectrum.sum()) for name,lo,hi in [('below200Hz',0,200),('200to1000Hz',200,1000),('above1000Hz',1000,sr/2)]}
report={'actualASource':'out/checkpoint-a/mix-preview-audio-final.mp4','window':cfg['window'],'durationSeconds':26.8,'musicGainsA':{'idle':.45,'thinking':.30,'speech':.20,'existingMultiplier':1.25},'musicGainsBCandidate':{'idle':.45*factor,'thinking':.30*factor,'speech':.20*factor,'existingMultiplier':1.25,'relativeDb':3},'narrationGainA':1,'narrationGainB':1,'appliedToProductionDefault':False,'masterReconstruction':{'method':'10ms least-squares gain against preserved pre-master mix, interpolated; estimate of A dynamic normalization; AAC/PCM residual remains in unchanged speech component','medianCorrelation':float(np.median(correlations)),'minimumCorrelation':min(correlations),'rawStemReconstructionRmsErrorDbFS':rms(raw-music-speech),'finalEstimatedReconstructionErrorDbFS':rms(actual-raw*gain)},'measurements':measure,'musicSpectralEnergyFractions':energy,'listeningPerformed':False,'providerCalls':0}
(p/'music-balance.json').write_text(json.dumps(report,indent=2))
fontpath='C:/Windows/Fonts/arialbd.ttf';font=ImageFont.truetype(fontpath,44);small=ImageFont.truetype(fontpath,27)
for label,subtitle in [('A','Actual Checkpoint A mix'),('B','Music +3 dB audition')]:
    im=Image.new('RGB',(540,960),'#172B3A');im.paste(Image.open(p/'frames/cream-navy-countdown.png').convert('RGB').resize((444,790)),(48,170));d=ImageDraw.Draw(im);d.rectangle((0,0,540,170),fill='#172B3A');d.text((28,14),label+' — MIX',font=font,fill='#FFD978');d.text((28,76),subtitle,font=small,fill='#FFF7E8');d.text((28,114),'Identical cached speech + track',font=ImageFont.truetype(fontpath,23),fill='#FFF7E8');im.save(p/f'mix-label-{label}.png')
print(json.dumps(report,indent=2))
