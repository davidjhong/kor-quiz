import {Composition} from 'remotion';
import {KoreanSample} from './KoreanSample';

export const Root = () => (
  <Composition
    id="KoreanSample"
    component={KoreanSample}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={360}
  />
);
