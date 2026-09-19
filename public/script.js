const socket = io();

let selectedCardsCount = 1;
let isJoined = false;

// የካርድ ብዛት መምረጫ
function selectCardCount(count) {
  selectedCardsCount = count;
  document.querySelectorAll('.card-opt-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

// "ጨዋታ ይቀላቀሉ" ሲጫኑ
function joinRoom() {
  if (isJoined) return;
  isJoined = true;
  
  const joinBtn = document.getElementById('join-btn');
  joinBtn.innerText = "ተቀላቅለዋል (በመጠበቅ ላይ...)";
  joinBtn.disabled = true;

  // ለሰርቨሩ ማሳወቅ
  socket.emit('joinLobby', { cardCount: selectedCardsCount });
}

// የሎቢ ሁኔታ ሲቀየር
socket.on('lobbyUpdate', (data) => {
  document.getElementById('lobby-status-text').innerText = data.status;
});

// የ 30 ሰከንድ ቆጠራ ሲጀምር
socket.on('countdownTick', (seconds) => {
  const timerDisplay = document.getElementById('countdown-display');
  const timerSec = document.getElementById('timer-seconds');
  
  timerDisplay.classList.remove('hidden');
  timerSec.innerText = seconds;
  document.getElementById('lobby-status-text').innerText = "ሌላ ተጫዋች ተገኝቷል!";
});

// ቆጠራው ከተሰረዘ (ተጫዋች ከወጣ)
socket.on('countdownCancel', (msg) => {
  document.getElementById('countdown-display').classList.add('hidden');
  document.getElementById('lobby-status-text').innerText = msg;
});

// ጨዋታው ሲጀምር (ከሎቢ ወደ Game View መቀየር)
socket.on('gameStarted', () => {
  document.getElementById('lobby-view').classList.add('hidden');
  document.getElementById('game-view').classList.remove('hidden');
  
  // ካርዱን እና ማስተር ቦርዱን ማዘጋጀት
  renderMasterBoard();
  renderBingoCard();
});

// የተጠራውን ቁጥር በስክሪን ላይ ማሳየት
socket.on('numberDrawn', (data) => {
  document.getElementById('calls-count').innerText = `${data.count}/75`;

  // ማስተር ቦርድ ላይ ቁጥሩን ማብራት
  const cell = document.getElementById(`master-cell-${data.number}`);
  if (cell) cell.classList.add('called');
});

// ማስተር ቦርድ መፍጠሪያ (1-75)
function renderMasterBoard() {
  const board = document.getElementById('master-board');
  if (!board || board.children.length > 0) return;
  
  for (let i = 1; i <= 75; i++) {
    const div = document.createElement('div');
    div.id = `master-cell-${i}`;
    div.className = 'master-cell';
    div.innerText = i;
    board.appendChild(div);
  }
}

// የቢንጎ ካርድ መፍጠሪያ
function renderBingoCard() {
  const container = document.getElementById('bingo-card-container');
  if (!container) return;
  container.innerHTML = "<h3>የእርስዎ የቢንጎ ካርድ ዝግጁ ነው!</h3>";
}

// ከጨዋታ መውጫ
function leaveGame() {
  location.reload();
}