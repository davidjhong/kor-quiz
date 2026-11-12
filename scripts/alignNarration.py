"""Local known-transcript alignment only. Never changes audio or calls a service."""
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import wave
import numpy as np
import torch
import torchaudio
import stable_whisper

job=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
config=job['configuration']
for package,expected in [('stable-ts',config['engineVersion']),('openai-whisper',config['whisperVersion']),('torch',config['torchVersion']),('torchaudio',config['torchVersion'])]:
    if importlib.metadata.version(package)!=expected: raise RuntimeError(f'Alignment dependency version mismatch: {package}')
torch.set_num_threads(config['threads'])
model=stable_whisper.load_model(config['model'],device='cpu',download_root=job['modelDirectory'])
checkpoint=Path(job['modelDirectory'])/(config['model']+'.pt')
if hashlib.sha256(checkpoint.read_bytes()).hexdigest()!=config['modelSha256']: raise RuntimeError('Alignment model checksum mismatch')
model.float().eval()
for clip in job['clips']:
    file=Path(clip['file'])
    if hashlib.sha256(file.read_bytes()).hexdigest()!=clip['audioSha256']: raise RuntimeError('Changed cached audio: '+clip['id'])
    with wave.open(str(file),'rb') as wav:
        if wav.getsampwidth()!=2 or wav.getnchannels()!=1: raise RuntimeError('Expected prepared mono PCM16 WAV')
        rate=wav.getframerate()
        audio=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(np.float32)/32768.0
    audio=torchaudio.functional.resample(torch.from_numpy(audio),rate,config['sampleRate']).numpy()
    result=model.align(audio,clip['transcript'],language='ko' if clip['language']=='ko-KR' else 'en',
        regroup=False,suppress_silence=True,vad=False,fast_mode=False,verbose=None)
    if result is None: raise RuntimeError('No alignment returned: '+clip['id'])
    words=[{'text':w.word,'start':w.start,'end':w.end,'probability':w.probability} for w in result.all_words()]
    record={'key':clip['key'],'audioSha256':clip['audioSha256'],'transcript':clip['transcript'],
        'language':clip['language'],'configuration':config,'durationSeconds':clip['durationSeconds'],'words':words}
    destination=Path(job['cacheDirectory'])/(clip['key']+'.json')
    temp=destination.with_suffix('.tmp')
    temp.write_text(json.dumps(record,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    os.replace(temp,destination)
    print(f"Aligned {clip['id']}: {len(words)} words",flush=True)
