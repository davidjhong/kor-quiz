import {Html5Audio, staticFile} from 'remotion';
import {getMusicGain, type SpeechSpan} from './presentation';
export const BackgroundAudio = ({file, duration, audio, countdowns}: {file: string; duration: number; audio: SpeechSpan[];
  countdowns: {countdownStart: number; revealStart: number}[]}) => <Html5Audio src={staticFile(file)} loop
    loopVolumeCurveBehavior="extend" volume={(frame) => getMusicGain(frame, duration, audio, countdowns)} />;
