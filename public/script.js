// Telegram WebApp SDK Initialization
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand(); // ሚኒ አፑን ሙሉ ስክሪን ማድረግ
    tg.ready();
}

// Socket.io Connection
const socket = io();

// የጨዋታ አጠቃላይ ስቴት (State Management)
let currentRoom = null;
let playerTicket = [];
let markedNumbers = new Set(['*']); // FREE space (*) በነባሪ የተመረጠ ነው

// 1. የቢንጎ ቲኬት (5x5 Ticket Generator) በህግ መሰረት ማመንጨት
function generateBingoTicket() {
    const getRandomNums = (min, max, count) => {
        const nums = [];
        while (nums.length < count) {
            const r = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!nums.includes(r)) nums.push(r);
        }
        return nums;
    };

    const b = getRandomNums(1, 15, 5);
    const i = getRandomNums(16, 30, 5);
    const n = getRandomNums(31, 45, 4); // 4 ቁጥር ብቻ (መካከለኛው FREE ነው)
    const g = getRandomNums(46, 60, 5);
    const o = getRandomNums(61, 75, 5);

    // 5x5 Matrix መገንባት
    const ticket = [];
    for (let r = 0; r < 5; r++) {
        const row = [
            b[r],
            i[r],
            r === 2 ? '*' : (r > 2 ? n[r - 1] : n[r]), // የመካከለኛው '*' ኮለም
            g[r],
            o[r]
        ];
        ticket.push(row);
    }
    return ticket;
}

// 2. የቲኬት UI በስክሪኑ ላይ መሳል
function renderTicketUI(ticket) {
    const ticketGrid = document.getElementById('player-ticket-grid');
    const miniCardPreview = document.getElementById('mini-card-preview');
    
    if (!ticketGrid) return;

    ticketGrid.innerHTML = '';
    if (miniCardPreview) miniCardPreview.innerHTML = '';

    ticket.forEach((row, rowIndex) => {
        row.forEach((val, colIndex) => {
            const cell = document.createElement('div');
            cell.className = 't-cell';
            
            if (val === '*') {
                cell.classList.add('star-cell', 'marked');
                cell.innerHTML = '&#9733;';
            } else {
                cell.innerText = val;
                cell.dataset.num = val;
                // ቁጥሩ ሲነካ መምረጫ (Daubing)
                cell.addEventListener('click', () => toggleMarkNumber(cell, val));
            }

            ticketGrid.appendChild(cell);

            // ለ Caller Screen Mini Preview
            if (miniCardPreview) {
                const miniCell = cell.cloneNode(true);
                miniCardPreview.appendChild(miniCell);
            }
        });
    });
}

// 3. ቁጥር የመምረጥ/የመጫን (Mark/Daub) ሎጂክ
function toggleMarkNumber(cellElement, num) {
    if (markedNumbers.has(num)) {
        markedNumbers.delete(num);
        cellElement.classList.remove('marked');
    } else {
        markedNumbers.add(num);
        cellElement.classList.add('marked');
    }
}

// 4. ወደ ጨዋታ ክፍል መቀላቀል (Join Room)
function joinGameRoom(roomId) {
    currentRoom = roomId;
    playerTicket = generateBingoTicket();
    renderTicketUI(playerTicket);

    const user = tg?.initDataUnsafe?.user || { username: 'Player' };
    
    socket.emit('join_room', {
        roomId: roomId,
        telegramUser: user
    });

    // በቀጥታ ወደ Gameplay View ማሸጋገር
    switchView('view-gameplay');
}

// ==================== SOCKET.IO LISTENERS (የቀጥታ ሁነቶች) ====================

// አዲስ ቁጥር ሲጠራ
socket.on('number_called', ({ ball, history }) => {
    // Current Call ማሳያዎችን ማዘመን
    const currentCallBox = document.querySelector('.call-ball-main');
    if (currentCallBox) {
        currentCallBox.innerText = ball.code;
    }

    // 1-75 Master Board ላይ የተጠራውን ቁጥር በከለር ማሳየት
    const masterCells = document.querySelectorAll('.cell-75');
    if (masterCells[ball.number - 1]) {
        masterCells[ball.number - 1].classList.add('called-active');
    }

    // የመጨረሻዎቹን 4 ቁጥሮች ታሪክ ማዘመን
    const historyContainer = document.querySelector('.recent-balls-row');
    if (historyContainer && history) {
        historyContainer.innerHTML = history.map(b => 
            `<span class="ball b-${getBallColorClass(b.letter)}">${b.code}</span>`
        ).join('');
    }
});

function getBallColorClass(letter) {
    switch (letter) {
        case 'B': return 'yellow';
        case 'I': return 'pink';
        case 'N': return 'blue';
        case 'G': return 'orange';
        case 'O': return 'green';
        default: return 'blue';
    }
}

// ቢንጎ አሸናፊ ሲኖር
socket.on('bingo_winner', ({ winnerSocketId, message }) => {
    if (winnerSocketId === socket.id) {
        alert('እንኳን ደስ አለዎት! ቢንጎ ብለው አሸንፈዋል! 🎉');
    } else {
        alert(`ጨዋታው ተጠናቋል! ${message}`);
    }
});

// BINGO Button Click Event
document.addEventListener('DOMContentLoaded', () => {
    const bingoBtn = document.getElementById('btn-bingo');
    if (bingoBtn) {
        bingoBtn.addEventListener('click', () => {
            if (!currentRoom) return alert('እባክዎን አስቀድመው ጨዋታ ይወቁ!');
            socket.emit('claim_bingo', {
                roomId: currentRoom,
                playerTicket: playerTicket
            });
        });
    }

    // የረከቦች/ክፍሎች JOIN ቁልፎች ላይ Event ማያያዝ
    const joinBtns = document.querySelectorAll('.btn-join');
    joinBtns.forEach((btn, index) => {
        const roomIds = ['room-10', 'room-20', 'room-50', 'room-100'];
        btn.addEventListener('click', () => joinGameRoom(roomIds[index] || 'room-10'));
    });

    const demoBtn = document.querySelector('.btn-try');
    if (demoBtn) {
        demoBtn.addEventListener('click', () => joinGameRoom('room-demo'));
    }
});