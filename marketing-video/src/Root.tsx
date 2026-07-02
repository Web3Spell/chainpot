import React from 'react';
import { Composition } from 'remotion';
import { ChainPotReel } from './ChainPotReel';
import { ShortA } from './shorts/ShortA';
import { ShortB } from './shorts/ShortB';
import { ShortC } from './shorts/ShortC';
import { ShortD } from './shorts/ShortD';
import { ShortE } from './shorts/ShortE';
import { ShortF } from './shorts/ShortF';
import { ShortG } from './shorts/ShortG';
import { ShortH } from './shorts/ShortH';
import { ShortI } from './shorts/ShortI';
import { ShortJ } from './shorts/ShortJ';
import { ShortK } from './shorts/ShortK';
import { ShortL } from './shorts/ShortL';
import { ShortM } from './shorts/ShortM';
import { ShortN } from './shorts/ShortN';
import { ShortO } from './shorts/ShortO';
import { ShortP } from './shorts/ShortP';
import { ShortQ } from './shorts/ShortQ';
import { ShortR } from './shorts/ShortR';
import { ShortS } from './shorts/ShortS';
import { ShortT } from './shorts/ShortT';
import { ShortU } from './shorts/ShortU';
import { ShortV } from './shorts/ShortV';
import { ShortW } from './shorts/ShortW';
import { ShortX } from './shorts/ShortX';
import { ShortY } from './shorts/ShortY';
import { ShortZ } from './shorts/ShortZ';
import { ShortAA } from './shorts/ShortAA';
import { ShortBB } from './shorts/ShortBB';
import { ShortCC } from './shorts/ShortCC';
import { ShortDD } from './shorts/ShortDD';
import { VIDEO } from './theme';

const common = {
  durationInFrames: VIDEO.durationInFrames,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="ChainPotReel" component={ChainPotReel} {...common} />
      <Composition id="ShortA" component={ShortA} {...common} />
      <Composition id="ShortB" component={ShortB} {...common} />
      <Composition id="ShortC" component={ShortC} {...common} />
      <Composition id="ShortD" component={ShortD} {...common} />
      <Composition id="ShortE" component={ShortE} {...common} />
      <Composition id="ShortF" component={ShortF} {...common} />
      <Composition id="ShortG" component={ShortG} {...common} />
      <Composition id="ShortH" component={ShortH} {...common} />
      <Composition id="ShortI" component={ShortI} {...common} />
      <Composition id="ShortJ" component={ShortJ} {...common} />
      <Composition id="ShortK" component={ShortK} {...common} />
      <Composition id="ShortL" component={ShortL} {...common} />
      <Composition id="ShortM" component={ShortM} {...common} />
      <Composition id="ShortN" component={ShortN} {...common} />
      <Composition id="ShortO" component={ShortO} {...common} />
      <Composition id="ShortP" component={ShortP} {...common} />
      <Composition id="ShortQ" component={ShortQ} {...common} />
      <Composition id="ShortR" component={ShortR} {...common} />
      <Composition id="ShortS" component={ShortS} {...common} />
      <Composition id="ShortT" component={ShortT} {...common} />
      <Composition id="ShortU" component={ShortU} {...common} />
      <Composition id="ShortV" component={ShortV} {...common} />
      <Composition id="ShortW" component={ShortW} {...common} />
      <Composition id="ShortX" component={ShortX} {...common} />
      <Composition id="ShortY" component={ShortY} {...common} />
      <Composition id="ShortZ" component={ShortZ} {...common} />
      <Composition id="ShortAA" component={ShortAA} {...common} />
      <Composition id="ShortBB" component={ShortBB} {...common} />
      <Composition id="ShortCC" component={ShortCC} {...common} />
      <Composition id="ShortDD" component={ShortDD} {...common} />
    </>
  );
};
