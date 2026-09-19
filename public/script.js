// ከሰርቨሩ የሚመጣውን የተጫዋች ብዛት ማዘመን
socket.on('playerCountUpdate', (count) => {
  const playerCountElem = document.getElementById('player-count'); // ወይም የተጫዋች ቁጥር ማሳያዎ ID
  if (playerCountElem) playerCountElem.innerText = count;
});

// ከሰርቨሩ የሚመጣውን የቆጠራ እና የጨዋታ ሁኔታ ሁኔታ ጽሁፍ ማዘመን
socket.on('statusUpdate', (statusText) => {
  const statusElem = document.querySelector('.game-status-text'); // ወይም የሁኔታ ጽሁፍ ማሳያዎ
  if (statusElem) statusElem.innerText = statusText;
});

// በራስ-ሰር የተጠራውን ቁጥር ማስተር ቦርድ እና ካርድ ላይ ማሳየት
socket.on('numberDrawn', (data) => {
  // የጥሪ ብዛቱን ማዘመን (ለምሳሌ 1/75)
  const callsElem = document.getElementById('calls-count');
  if (callsElem) callsElem.innerText = `${data.count}/75`;

  // ማስተር ቦርድ ላይ ቁጥሩን ከለር መቀየር/ማብራት
  const masterCell = document.getElementById(`master-num-${data.number}`);
  if (masterCell) {
    masterCell.classList.add('called');
  }
});

// ተጫዋቹ ካርዴን መርጬ ጨዋታ ገብቻለሁ ለማለት Join አዝራሩ ሲጫን የሚሰራ
function onPlayerJoin() {
  socket.emit('joinGame');
}