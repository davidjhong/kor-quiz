import {runRemotion} from './remotionCommand.ts';
export const measureAudio = async (file: string, targets={integratedLUFS:-16,truePeakDbTP:-2,loudnessRangeLU:11},inputFilter='') => {
  const stderr = await runRemotion(['ffmpeg', '-hide_banner', '-nostats', '-i', file, '-vn', '-af',
    [inputFilter,`loudnorm=I=${targets.integratedLUFS}:TP=${targets.truePeakDbTP}:LRA=${targets.loudnessRangeLU}:print_format=json`].filter(Boolean).join(','), '-f', 'null', '-'], true, 60000, true);
  const raw = stderr.match(/\{\s*"input_i"[\s\S]*?\}/u)?.[0];
  if (!raw) throw new Error('FFmpeg returned no loudness measurements');
  const data = JSON.parse(raw) as Record<string,string>;
  if (![data.input_i,data.input_tp,data.input_lra].every((n)=>Number.isFinite(Number(n)))) throw new Error('Invalid/nonfinite audio loudness measurement');
  return {integratedLUFS:Number(data.input_i),truePeakDbTP:Number(data.input_tp),loudnessRangeLU:Number(data.input_lra), raw:data};
};
