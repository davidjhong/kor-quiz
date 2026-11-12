import {Html5Audio, staticFile} from 'remotion';
import {getMusicGain, type SpeechSpan} from './presentation';
export const BackgroundAudio = ({file, duration, audio, countdowns, gain = 1,levels}: {file: string; duration: number; audio: SpeechSpan[];
  countdowns: {countdownStart: number; revealStart: number}[]; gain?: number;levels?:{idle:number;thinking:number;speech:number}}) => <Html5Audio src={staticFile(file)} loop
    loopVolumeCurveBehavior="extend" volume={(frame) => getMusicGain(frame, duration, audio, countdowns, gain,levels)} />;
