import React from 'react';

export default function AssetLoader (props) {
  return (
    <a-assets>
      <img id="yoonah-background" src="/yoonah/background.jpg" />
      <img id="beth-background" src="/beth/background.jpg" />
      <img id="joey-background" src="/joey/background.jpg" />
      <img id="sean-background" src="/sean/background.jpg" />
      <a-asset-item id="IBM-360" src="/sean/console.dae"></a-asset-item>
      <a-asset-item id="terminal-typewriter" src="/sean/teletype.dae"></a-asset-item>
      <a-asset-item id="tape-drive" src="/sean/tape-reader.dae"></a-asset-item>
      <a-asset-item id="disk-pack" src="/sean/diskpack.dae"></a-asset-item>
      <a-asset-item id="punch-reader" src="/sean/card-reader.dae"></a-asset-item>

      {/* Lobby assets */}
      <img id="slide" src="/img/class.png"/>
      <img id="podium" src="/img/fullstack.png"/>
      <img id="floorText" src="/img/hardwood.jpg"/>
      <a-mixin id="chair-part" geometry="primitive: box" material="color: brown"></a-mixin>
      <a-asset-item id="frog" src="/img/frog1.dae"></a-asset-item>
    </a-assets>
  );
}
