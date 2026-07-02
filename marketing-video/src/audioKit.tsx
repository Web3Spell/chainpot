import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';

const T = 12; // transition length used across shorts

// scene start frames on the global timeline for a TransitionSeries
export const sceneStarts = (durations: number[]): number[] => {
  const starts: number[] = [];
  let acc = 0;
  durations.forEach((d, i) => {
    starts.push(acc);
    acc += d - T;
  });
  return starts;
};

export type Cue = { s: number; at: number; src: string; v?: number; len?: number };

const Hit: React.FC<{ at: number; src: string; v?: number; len?: number }> = ({ at, src, v = 1, len = 60 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={len} name={src}>
    <Audio src={staticFile(`sfx/${src}`)} volume={v} />
  </Sequence>
);

// Music bed + auto transition swishes + scene-relative accent cues.
export const ShortAudio: React.FC<{
  music: string;
  musicVol?: number;
  durations: number[];
  cues?: Cue[];
  swishVol?: number;
}> = ({ music, musicVol = 0.72, durations, cues = [], swishVol = 0.26 }) => {
  const starts = sceneStarts(durations);
  return (
    <>
      <Hit at={0} src={music} v={musicVol} len={900} />
      {starts.slice(1).map((s, i) => (
        <Hit key={`sw${i}`} at={s - 10} src="swish.wav" v={swishVol} len={16} />
      ))}
      {cues.map((c, i) => (
        <Hit key={`c${i}`} at={(starts[c.s] ?? 0) + c.at} src={c.src} v={c.v} len={c.len} />
      ))}
    </>
  );
};
