import React from 'react';
import './PlaybackBar.css';

const PlaybackBar = () => {
  // Removed seek functionality 
  return (
    <div className="playback-bar">
      <span>Current Time: 00:00</span>
      {/* No seek bar implemented */}
    </div>
  );
};

export default PlaybackBar;

// Other imports...

const MAX_NOMOR_MESIN_LENGTH = 12;

const mesinValid = (nomorMesin) => {
  return nomorMesin.length === MAX_NOMOR_MESIN_LENGTH;
};

const formatNomorMesin = (nomorMesin) => {
  // Formatting as 5 chars + space + 7 chars
  return `${nomorMesin.slice(0, 5)} ${nomorMesin.slice(5, 12)}`;
};

const WHATS_NEW_ITEMS = [
  'Nomor mesin kini 12 karakter',
  // Other items...
];

// License header updated
// © 2026 Example Corp.