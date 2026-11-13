"""Measure decoded A/B speech residuals against the explicitly estimated stem."""
import json,wave
import numpy as np
from pathlib import Path
p=Path('out/checkpoint-b');r=json.loads((p/'music-balance.json').read_text(encoding='utf-8'))
encoded=json.loads((p/'mix-encoded-measurements.json').read_text(encoding='utf-8'));r.update(encoded)
def read(f):
    with wave.open(str(f),'rb') as w:return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float).reshape(-1,2)/32768
def rms(x):return float(20*np.log10(max(1e-12,np.sqrt(np.mean(x*x)))))
sr=48000;start=round(7.8*sr);count=round(13.4*sr);m=read(p/'music-a-master-estimate.wav')[start:start+count]*10**(r['commonMasterGainDb']/20)
a=read(p/'final-A.wav');b=read(p/'final-B.wav');factor=10**(3/20)
for window in r['measurements']:
    s=round((window['start']-7.8)*sr);e=round((window['end']-7.8)*sr)
    window['estimatedEncodedMusicADbFS']=rms(m[s:e]);window['estimatedEncodedMusicBDbFS']=rms(m[s:e]*factor)
    if window['section']!='countdown':
        sa=a[s:e]-m[s:e];sb=b[s:e]-m[s:e]*factor
        window['estimatedDecodedNarrationADbFS']=rms(sa);window['estimatedDecodedNarrationBDbFS']=rms(sb);window['estimatedNarrationDifferenceDb']=rms(sb)-rms(sa)
        assert abs(window['estimatedNarrationDifferenceDb'])<.1
    else:
        window['decodedActualCountdownADbFS']=rms(a[s:e]);window['decodedActualCountdownBDbFS']=rms(b[s:e]);window['measuredCountdownIncreaseDb']=rms(b[s:e])-rms(a[s:e]);assert abs(window['measuredCountdownIncreaseDb']-3)<.1
r['balanceLimitation']='Pre-master stems are measured directly. Post-master stems use a 10ms gain estimate of A dynamic normalization, not exact provider tracks. Decoded residual narration differences and music-only countdown difference were checked; subjective masking was not assessed.'
(p/'music-balance.json').write_text(json.dumps(r,indent=2))
print(json.dumps(r['measurements'],indent=2))
