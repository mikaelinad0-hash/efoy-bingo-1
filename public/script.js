const tg = window.Telegram.WebApp;
try { tg.expand(); tg.ready(); } catch(e) {}

function haptic(style) {
    try { if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style || 'medium'); } catch(e) {}
}

let balance = 1200;
let calledNumbers = [];
let callTimer = null;
let availablePool = [];
let cardNumbers = [];
let soundEnabled = true;
let vibrateEnabled = true;
let currentRoom = null;
let refCount = 0;
let refEarned = 0;
let gameHistory = [];
let countdownVal = 4;
let countdownInterval = null;
let currentBoardNumber = 0;
let gameStarted = false;
let playerName = 'ተጫዋች';

function letterOf(n){ return n <= 15 ? 'B' : n <= 30 ? 'I' : n <= 45 ? 'N' : n <= 60 ? 'G' : 'O'; }

const ROOMS = [
    { name:'ነፃ ክፍል (Free Room)', fee:0,  prize:150,  bonus:10,  players:'6-15', hot:false },
    { name:'ጀማሪ (Beginner)',      fee:10, prize:900,  bonus:45,  players:'8-20', hot:true  },
    { name:'መካከለኛ (Intermediate)', fee:25, prize:2200, bonus:110, players:'6-18', hot:false },
    { name:'ፕሮ (Pro)',             fee:50, prize:4500, bonus:225, players:'4-12', hot:true  },
    { name:'VIP',                  fee:100,prize:9500, bonus:475, players:'4-10', hot:false },
    { name:'ምሽት ልዩ (Night Special)', fee:30, prize:3000, bonus:150, players:'6-16', hot:false }
];

function alertMsg(m){ tg.showAlert ? tg.showAlert(m) : alert(m); }
function fmt(n){ return n.toLocaleString(); }

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg' + (type === 'success' ? ' toast-success' : '');
    toast.innerText = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

function updateBalanceUI() {
    document.getElementById('cashier-balance').innerText = fmt(balance) + ' 💰';
}

function renderRooms() {
    const list = document.getElementById('room-list');
    list.innerHTML = '';
    ROOMS.forEach(r => {
        const canJoin = balance >= r.fee;
        const card = document.createElement('div');
        card.className = 'room-card' + (r.hot ? ' hot' : '');
        card.innerHTML = `
            <div>
                <div class="room-name">${r.name}</div>
                <div style="color:var(--accent-green); font-size:13px;">🏆 ${fmt(r.prize)} ኮይን</div>
                <div class="room-meta">👥 ${r.players} ተጫዋቾች</div>
            </div>
            <button class="join-btn" ${canJoin ? '' : 'disabled'}>${r.fee === 0 ? 'ነፃ ግባ' : r.fee + ' 💰 ግባ'}</button>
        `;
        card.querySelector('button').onclick = () => joinRoom(r);
        list.appendChild(card);
    });
}

function renderLeaderboard() {
    const names = ['አበበ','ሰላም','ዮሃንስ','ብርሃኔ','ፍቅሩ','ሄለን','ናትናኤል','ሚካኤል','ራሔል','ሳራ'];
    let data = names.map(n => ({ name:n, coins: Math.floor(Math.random()*8000)+500 }));
    data.push({ name: playerName, coins: balance, me:true });
    data.sort((a,b) => b.coins - a.coins);

    const box = document.getElementById('leaderboard-list');
    box.innerHTML = '';
    data.slice(0,10).forEach((p, i) => {
        const rankClass = i===0?'r1':i===1?'r2':i===2?'r3':'';
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1);
        const row = document.createElement('div');
        row.className = 'leader-row' + (p.me ? ' me' : '');
        row.innerHTML = `
            <div class="leader-rank ${rankClass}">${medal}</div>
            <div class="leader-avatar">${p.me ? '👤' : '🙂'}</div>
            <div class="leader-name">${p.name}${p.me ? ' (እርስዎ)' : ''}</div>
            <div class="leader-coins">${fmt(p.coins)} 💰</div>
        `;
        box.appendChild(row);
    });
}

function setupInvite() {
    const uid = (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || Math.floor(Math.random()*900000+100000);
    document.getElementById('invite-link').value = `https://t.me/EfoyBingoBot?start=ref_${uid}`;
    updateRefUI();
}

function updateRefUI() {
    document.getElementById('ref-count').innerText = refCount;
    document.getElementById('ref-earned').innerText = fmt(refEarned);
}

function copyInviteLink() {
    const input = document.getElementById('invite-link');
    input.select();
    try { document.execCommand('copy'); alertMsg('🔗 ሊንኩ ተቀድቷል!'); }
    catch(e) { alertMsg(input.value); }
}

function shareInvite() {
    const link = document.getElementById('invite-link').value;
    if (tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('ወደ እፎይ ቢንጎ ተቀላቀል!')}`);
    } else {
        alertMsg('የግብዣ ሊንክ ተቀድቷል፣ ለጓደኛዎ ይላኩ!');
        copyInviteLink();
    }
}

function simulateInvite() {
    refCount++;
    refEarned += 100;
    balance += 100;
    updateRefUI();
    updateBalanceUI();
    alertMsg(`🎉 አዲስ ጓደኛ ተቀላቀለ! +100 💰 ተሸልመዋል።`);
}

function switchTab(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.getElementById('screen-' + name).classList.add('active-screen');
    const navKey = (name === 'invite') ? 'settings' : name;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === navKey));
    if (name === 'leaderboard') renderLeaderboard();
    if (name === 'history') renderHistory();
}

function generateMasterBoard() {
    const board = document.getElementById('master-board');
    board.innerHTML = `
        <div class="master-cell header letter-b">B</div><div class="master-cell header letter-i">I</div>
        <div class="master-cell header letter-n">N</div><div class="master-cell header letter-g">G</div><div class="master-cell header letter-o">O</div>
    `;
    const cols = [ [1,15], [16,30], [31,45], [46,60], [61,75] ];
    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 5; col++) {
            const num = cols[col][0] + row;
            board.innerHTML += `<div class="master-cell" id="master-cell-${num}">${num}</div>`;
        }
    }
}

function markMasterCalled(num, isCurrent) {
    document.querySelectorAll('.master-cell.current').forEach(c => c.classList.remove('current'));
    const cell = document.getElementById('master-cell-' + num);
    if (cell) cell.classList.add('called', isCurrent ? 'current' : '');
}

function generateBingoCard() {
    const board = document.getElementById('bingo-board');
    board.innerHTML = `
        <div class="bingo-cell header letter-b">B</div><div class="bingo-cell header letter-i">I</div>
        <div class="bingo-cell header letter-n">N</div><div class="bingo-cell header letter-g">G</div><div class="bingo-cell header letter-o">O</div>
    `;
    cardNumbers = [];
    const cols = [genCol(1,15), genCol(16,30), genCol(31,45), genCol(46,60), genCol(61,75)];
    for (let row = 0; row < 5; row++) {
        let rowData = [];
        for (let col = 0; col < 5; col++) {
            if (row === 2 && col === 2) {
                board.innerHTML += `<div class="bingo-cell free-space marked" id="cell-free">⭐<br>FREE</div>`;
                rowData.push("FREE");
            } else {
                const num = cols[col][row];
                board.innerHTML += `<div class="bingo-cell" id="cell-${num}" onclick="toggleMark(this, ${num})">${num}</div>`;
                rowData.push(num);
            }
        }
        cardNumbers.push(rowData);
    }
}

function genCol(min, max) {
    let nums = [];
    while (nums.length < 5) {
        let r = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!nums.includes(r)) nums.push(r);
    }
    return nums;
}

function toggleMark(element, num) {
    if (calledNumbers.includes(num)) {
        element.classList.toggle('marked');
        haptic('light');
        updateBingoButtonState();
    } else {
        alertMsg("ይህ ቁጥር ገና አልተጠራም!");
    }
}

function autoMarkIfOnCard(num) {
    const cell = document.getElementById('cell-' + num);
    if (cell && !cell.classList.contains('marked')) {
        cell.classList.add('marked');
        haptic('medium');
    }
}

// --- Win-line detection ---
function cellEl(v) { return v === 'FREE' ? document.getElementById('cell-free') : document.getElementById('cell-' + v); }
function isMarked(r, c) {
    const v = cardNumbers[r][c];
    if (v === 'FREE') return true;
    const el = document.getElementById('cell-' + v);
    return !!(el && el.classList.contains('marked'));
}
function evaluateWin() {
    if (!cardNumbers.length) return null;
    for (let r = 0; r < 5; r++) {
        let ok = true;
        for (let c = 0; c < 5; c++) if (!isMarked(r, c)) { ok = false; break; }
        if (ok) return cardNumbers[r].map(cellEl);
    }
    for (let c = 0; c < 5; c++) {
        let ok = true;
        for (let r = 0; r < 5; r++) if (!isMarked(r, c)) { ok = false; break; }
        if (ok) return cardNumbers.map(row => cellEl(row[c]));
    }
    let ok = true, diag1 = [];
    for (let i = 0; i < 5; i++) { diag1.push(cellEl(cardNumbers[i][i])); if (!isMarked(i, i)) ok = false; }
    if (ok) return diag1;
    ok = true; let diag2 = [];
    for (let i = 0; i < 5; i++) { diag2.push(cellEl(cardNumbers[i][4 - i])); if (!isMarked(i, 4 - i)) ok = false; }
    if (ok) return diag2;
    return null;
}

function updateBingoButtonState() {
    const btn = document.getElementById('bingo-action-btn');
    if (!btn || !gameStarted) return;
    const win = evaluateWin();
    if (win) {
        btn.classList.remove('dim');
        btn.classList.add('glow-pulse');
    } else {
        btn.classList.add('dim');
        btn.classList.remove('glow-pulse');
    }
}

function joinRoom(room) {
    if (balance < room.fee) { alertMsg("በቂ ቀሪ ሂሳብ የለዎትም።"); return; }
    balance -= room.fee;
    updateBalanceUI();
    currentRoom = room;
    currentBoardNumber = Math.floor(Math.random() * 300) + 1;
    gameStarted = false;

    document.getElementById('pre-game-area').style.display = 'block';
    document.getElementById('in-game-area').style.display = 'none';

    document.getElementById('stat-gameid').innerText = '#' + Math.floor(Math.random() * 9000 + 1000);
    document.getElementById('stat-stake').innerText = room.fee === 0 ? 'ነፃ' : fmt(room.fee);
    document.getElementById('stat-derash').innerText = fmt(room.prize);
    document.getElementById('stat-bonus').innerText = fmt(room.bonus);
    document.getElementById('stat-players').innerText = Math.floor(Math.random() * 15) + 4;
    document.getElementById('stat-callcount').innerText = '0/75';
    document.getElementById('board-number').innerText = '#' + currentBoardNumber;
    document.getElementById('called-balls').innerHTML = '';
    document.getElementById('countdown-status').innerText = 'ዝግጁ';

    const bingoBtn = document.getElementById('bingo-action-btn');
    bingoBtn.disabled = true;
    bingoBtn.classList.add('dim');
    bingoBtn.classList.remove('glow-pulse');

    const callBadge = document.getElementById('current-call');
    callBadge.innerText = '--';
    callBadge.classList.remove('letter-b','letter-i','letter-n','letter-g','letter-o');

    switchScreenDirect('game');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === 'lobby'));
    generateBingoCard();
    generateMasterBoard();
}

function switchScreenDirect(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.getElementById('screen-' + name).classList.add('active-screen');
}

function startGame() {
    document.getElementById('pre-game-area').style.display = 'none';
    document.getElementById('in-game-area').style.display = 'block';
    gameStarted = true;
    document.getElementById('bingo-action-btn').disabled = false;
    calledNumbers = [];
    availablePool = Array.from({length: 75}, (_, i) => i + 1);
    callNextNumber();
    callTimer = setInterval(callNextNumber, 4000);
    startCountdownCycle();
}

function startCountdownCycle() {
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        countdownVal--;
        if (countdownVal < 0) countdownVal = 0;
        const el = document.getElementById('countdown-status');
        if (el) el.innerText = String(countdownVal).padStart(2, '0') + 'ሰ';
    }, 1000);
}

function resetCountdownBar() {
    const bar = document.getElementById('countdown-bar');
    if (!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '100%';
    void bar.offsetWidth;
    bar.style.transition = 'width 4s linear';
    bar.style.width = '0%';
}

function callNextNumber() {
    if (availablePool.length === 0) {
        clearInterval(callTimer);
        clearInterval(countdownInterval);
        recordHistory(false, -(currentRoom ? currentRoom.fee : 0));
        return;
    }
    let randIdx = Math.floor(Math.random() * availablePool.length);
    let num = availablePool.splice(randIdx, 1)[0];
    calledNumbers.push(num);
    markMasterCalled(num, true);
    autoMarkIfOnCard(num);
    updateBingoButtonState();
    haptic('medium');
    countdownVal = 4;
    document.getElementById('countdown-status').innerText = '04ሰ';
    document.getElementById('stat-callcount').innerText = calledNumbers.length + '/75';
    resetCountdownBar();

    let letter = letterOf(num);

    let badge = document.getElementById('current-call');
    badge.classList.remove('letter-b','letter-i','letter-n','letter-g','letter-o');
    badge.classList.add('letter-' + letter.toLowerCase());
    badge.innerText = `${letter}-${num}`;
    badge.classList.remove('pop-anim');
    void badge.offsetWidth;
    badge.classList.add('pop-anim');

    renderCalledBalls();

    if (soundEnabled && 'speechSynthesis' in window) {
        let msg = new SpeechSynthesisUtterance(`${letter}, ${num}`);
        msg.lang = 'en-US';
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
    }
}

function renderCalledBalls() {
    const box = document.getElementById('called-balls');
    if (!box) return;
    const last = calledNumbers.slice(-4).reverse();
    box.innerHTML = last.map((n, i) => `<div class="called-ball ball-${letterOf(n).toLowerCase()}${i===0 ? ' pop-anim' : ''}">${letterOf(n)}${n}</div>`).join('');
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const icon = soundEnabled ? '🔊' : '🔇';
    const metricIcon = document.getElementById('metric-sound-icon');
    if (metricIcon) metricIcon.innerText = icon;
    document.getElementById('settings-sound-toggle').classList.toggle('on', soundEnabled);
    if (!soundEnabled) window.speechSynthesis.cancel();
}

function toggleVibrate() {
    vibrateEnabled = !vibrateEnabled;
    document.getElementById('settings-vibrate-toggle').classList.toggle('on', vibrateEnabled);
}

function saveName() {
    const val = document.getElementById('name-input').value.trim();
    if (val) {
        playerName = val;
        alertMsg("ስም ተቀይሯል!");
    }
}

function addFunds(amount) {
    balance += amount;
    updateBalanceUI();
    alertMsg(`${amount} 💰 ተጨምሯል!`);
}

function showDemoAlert() {
    alertMsg('ይህ የማሳያ ስሪት ነው። እውነተኛ ክፍያ ገና አልተገናኘም።');
}

function leaveGame() {
    clearInterval(callTimer);
    clearInterval(countdownInterval);
    window.speechSynthesis.cancel();
    gameStarted = false;
    switchScreenDirect('lobby');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === 'lobby'));
    renderRooms();
}

function refreshGame() {
    haptic('light');
    document.getElementById('stat-callcount').innerText = calledNumbers.length + '/75';
    document.getElementById('stat-players').innerText = Math.floor(Math.random() * 15) + 4;
    renderCalledBalls();
    showToast('🔄 ገጹ ታድሷል', 'success');
}

function checkWin() {
    haptic('medium');
    const winCells = evaluateWin();
    if (winCells) {
        clearInterval(callTimer);
        clearInterval(countdownInterval);
        window.speechSynthesis.cancel();
        winCells.forEach(el => { if (el) el.classList.add('winning-cell'); });
        const prize = currentRoom ? currentRoom.prize : 0;
        balance += prize;
        updateBalanceUI();
        recordHistory(true, prize);
        const btn = document.getElementById('bingo-action-btn');
        btn.disabled = true;
        btn.classList.remove('glow-pulse');
        showToast(`🎉 ቢንጎ! +${fmt(prize)} 💰`, 'success');
        alertMsg(`🎉 እንኳን ደስ አለዎት! ቢንጎ ብለዋል! +${fmt(prize)} 💰`);
    } else {
        showToast('❌ ትክክለኛ መስመር ገና የለዎትም!', 'error');
    }
}

function recordHistory(won, amount) {
    gameHistory.unshift({
        room: currentRoom ? currentRoom.name : 'ጨዋታ',
        won: won,
        amount: amount,
        time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})
    });
    gameHistory = gameHistory.slice(0, 20);
}

function renderHistory() {
    const box = document.getElementById('history-list');
    if (gameHistory.length === 0) {
        box.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px 0; font-size:13px;">እስካሁን የተጫወቱት ጨዋታ የለም።</div>`;
        return;
    }
    box.innerHTML = '';
    gameHistory.forEach(h => {
        const row = document.createElement('div');
        row.className = 'leader-row';
        row.innerHTML = `
            <div class="leader-avatar">${h.won ? '🏆' : '🎲'}</div>
            <div class="leader-name">${h.room}<div style="font-size:11px; color:var(--text-muted); font-weight:400;">${h.time}</div></div>
            <div class="leader-coins" style="color:${h.won ? 'var(--accent-green)' : '#e57373'};">${h.won ? '+' : ''}${fmt(h.amount)} 💰</div>
        `;
        box.appendChild(row);
    });
}

// Init
renderRooms();
updateBalanceUI();
setupInvite();

const leaveBtnEl = document.getElementById('leave-btn');
if (leaveBtnEl) leaveBtnEl.addEventListener('click', leaveGame);
const refreshBtnEl = document.getElementById('refresh-btn');
if (refreshBtnEl) refreshBtnEl.addEventListener('click', refreshGame);
