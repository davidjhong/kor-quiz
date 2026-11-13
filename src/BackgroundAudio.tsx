import {Html5Audio, staticFile} from 'remotion';
import {getMusicGain, type SpeechSpan} from './presentation';
export const BackgroundAudio = ({file, duration, audio, countdowns, gain = 1,levels,trimDb=0}: {file: string; duration: number; audio: SpeechSpan[];
  countdowns: {countdownStart: number; revealStart: number}[]; gain?: number;trimDb?:number;levels?:{idle:number;thinking:number;speech:number}}) => <Html5Audio src={staticFile(file)} loop
    loopVolumeCurveBehavior="extend" volume={(frame) => getMusicGain(frame, duration, audio, countdowns, gain*10**(trimDb/20),levels)} />;
