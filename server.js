const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Static Files Serve ማድረጊያ
app.use(express.static(path.join(__dirname, 'public')));

// የጨዋታ ክፍሎች (Game Rooms Config)
const ROOMS = {
    'room-10': { id: 'room-10', stake: 10, name: '10 ETB', players: new Map(), drawnNumbers: [], timer: null, status: 'WAITING' },
    'room-20': { id: 'room-20', stake: 20, name: '20 ETB', players: new Map(), drawnNumbers: [], timer: null, status: 'WAITING' },
    'room-50': { id: 'room-50', stake: 50, name: '50 ETB', players: new Map(), drawnNumbers: [], timer: null, status: 'WAITING' },
    'room-100': { id: 'room-100', stake: 100, name: '100 ETB', players: new Map(), drawnNumbers: [], timer: null, status: 'WAITING' },
    'room-demo': { id: 'room-demo', stake: 0, name: 'Free Demo', players: new Map(), drawnNumbers: [], timer: null, status: 'WAITING' }
};

// 1-75 የቢንጎ ቁጥሮች ማመንጫ እና የፊደል መመደቢያ
function getBingoBall(number) {
    if (number <= 15) return { letter: 'B', number, code: `B-${number}` };
    if (number <= 30) return { letter: 'I', number, code: `I-${number}` };
    if (number <= 45) return { letter: 'N', number, code: `N-${number}` };
    if (number <= 60) return { letter: 'G', number, code: `G-${number}` };
    return { letter: 'O', number, code: `O-${number}` };
}

// የጨዋታ ቁጥሮችን መጥሪያ ኡደት (Number Calling Loop)
function startGameLoop(roomId) {
    const room = ROOMS[roomId];
    if (!room || room.status === 'RUNNING') return;

    room.status = 'RUNNING';
    room.drawnNumbers = [];
    
    let availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    
    // በየ 4 ሴኮንዱ አንድ ቁጥር መጥራት
    room.timer = setInterval(() => {
        if (availableNumbers.length === 0 || room.status !== 'RUNNING') {
            clearInterval(room.timer);
            room.status = 'FINISHED';
            io.to(roomId).emit('game_ended', { message: 'ጨዋታው ተጠናቋል!' });
            return;
        }

        // በዘፈቀደ ቁጥር መምረጥ
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const calledNum = availableNumbers.splice(randomIndex, 1)[0];
        const ball = getBingoBall(calledNum);

        room.drawnNumbers.push(calledNum);

        // ለክፍሉ ተጫዋቾች በሙሉ ቁጥሩን ማሰራጨት (Broadcast)
        io.to(roomId).emit('number_called', {
            ball: ball,
            history: room.drawnNumbers.slice(-4).map(getBingoBall), // የመጨረሻዎቹ 4 ቁጥሮች
            totalDrawn: room.drawnNumbers.length
        });

    }, 4000);
}

// Socket.io Real-time Connections
io.on('connection', (socket) => {
    console.log(`ተጫዋች ተገናኝቷል: ${socket.id}`);

    // ተጫዋች ወደ ክፍል ሲቀላቀል
    socket.on('join_room', ({ roomId, telegramUser }) => {
        const room = ROOMS[roomId];
        if (!room) return socket.emit('error_msg', 'ትክክለኛ ያልሆነ የጨዋታ ክፍል!');

        socket.join(roomId);
        room.players.set(socket.id, {
            id: socket.id,
            user: telegramUser || { username: 'Guest_' + socket.id.substring(0, 4) }
        });

        // የተጫዋቹን መረጃ ማረጋገጫ መላክ
        socket.emit('room_joined', {
            roomId: room.id,
            stake: room.stake,
            playersCount: room.players.size,
            drawnNumbers: room.drawnNumbers.map(getBingoBall)
        });

        // ለክፍሉ አዲስ ተጫዋች መግባቱን ማሳወቅ
        io.to(roomId).emit('player_count_update', { count: room.players.size });

        // ተጫዋቾች ከ 2 በላይ ከሆኑ ጨዋታውን ማስጀመር (ለቴስት)
        if (room.status === 'WAITING' && room.players.size >= 1) {
            startGameLoop(roomId);
        }
    });

    // BINGO! ሲባል ማረጋገጫ (Validation Logic)
    socket.on('claim_bingo', ({ roomId, playerTicket }) => {
        const room = ROOMS[roomId];
        if (!room) return;

        // ሁሉንም የተጠሩ ቁጥሮች ማረጋገጥ
        const drawnSet = new Set(room.drawnNumbers);
        let isValidBingo = true;

        // ቀሊል የ 5x5 ረድፍ/አምድ ማረጋገጫ ሎጂክ
        // (ተጫዋቹ የሰየማቸው ቁጥሮች በሙሉ በተጠሩት ውስጥ መኖራቸውን ያረጋግጣል)
        for (let row of playerTicket) {
            for (let num of row) {
                if (num !== '*' && !drawnSet.has(num)) {
                    isValidBingo = false;
                    break;
                }
            }
        }

        if (isValidBingo) {
            clearInterval(room.timer);
            room.status = 'FINISHED';
            io.to(roomId).emit('bingo_winner', {
                winnerSocketId: socket.id,
                message: 'ቢንጎ! አሸናፊ ተገኝቷል!'
            });
        } else {
            socket.emit('invalid_bingo', { message: 'ትክክለኛ ያልሆነ ቢንጎ! ቁጥሮቹን ደግመው ያረጋግጡ።' });
        }
    });

    // ተጫዋች ሲወጣ
    socket.on('disconnect', () => {
        for (const roomId in ROOMS) {
            const room = ROOMS[roomId];
            if (room.players.has(socket.id)) {
                room.players.delete(socket.id);
                io.to(roomId).emit('player_count_update', { count: room.players.size });
            }
        }
        console.log(`ተጫዋች ወጥቷል: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`EFOY BINGO Server running on port ${PORT}`);
});