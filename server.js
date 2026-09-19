const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// የ public ፎልደር ውስጥ ያሉትን ፋይሎች ማንበቢያ (ይህ መስመር ነው)
app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

function getOrCreateRoom(roomId) {
    if (!rooms[roomId]) {
        rooms[roomId] = {
            id: roomId,
            players: {},
            calledNumbers: [],
            gameState: 'waiting',
            countdownTimer: 10,
            gameInterval: null,
            countdownInterval: null
        };
    }
    return rooms[roomId];
}

io.on('connection', (socket) => {
    console.log(`[CONNECTED] User: ${socket.id}`);

    socket.on('join_room', (data) => {
        const roomId = data.roomId || 'room_1';
        const room = getOrCreateRoom(roomId);

        socket.join(roomId);
        room.players[socket.id] = {
            id: socket.id,
            cardsCount: data.cardsCount || 1,
            cards: data.cards || []
        };

        io.to(roomId).emit('update_players_count', Object.keys(room.players).length);

        if (Object.keys(room.players).length >= 2 && room.gameState === 'waiting') {
            startRoomCountdown(roomId);
        }
    });

    socket.on('claim_bingo', (data) => {
        const roomId = data.roomId || 'room_1';
        const room = rooms[roomId];

        if (room && room.gameState === 'playing') {
            io.to(roomId).emit('game_over', {
                winnerId: socket.id,
                message: `🎉 ተጫዋች (${socket.id.substring(0, 5)}) BINGO ብሏል!`
            });
            resetRoom(roomId);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[DISCONNECTED] User: ${socket.id}`);
        for (let roomId in rooms) {
            let room = rooms[roomId];
            if (room.players[socket.id]) {
                delete room.players[socket.id];
                io.to(roomId).emit('update_players_count', Object.keys(room.players).length);
            }
        }
    });
});

function startRoomCountdown(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.gameState = 'countdown';
    room.countdownTimer = 10;

    io.to(roomId).emit('countdown_started', { duration: room.countdownTimer });

    room.countdownInterval = setInterval(() => {
        room.countdownTimer--;
        io.to(roomId).emit('countdown_tick', { timer: room.countdownTimer });

        if (room.countdownTimer <= 0) {
            clearInterval(room.countdownInterval);
            startRoomGame(roomId);
        }
    }, 1000);
}

function startRoomGame(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.gameState = 'playing';
    room.calledNumbers = [];
    io.to(roomId).emit('game_started');

    room.gameInterval = setInterval(() => {
        if (room.calledNumbers.length >= 75) {
            io.to(roomId).emit('game_over', { message: 'ሁሉም ቁጥሮች ተጠርተው አልቀዋል!' });
            resetRoom(roomId);
            return;
        }

        let num;
        do {
            num = Math.floor(Math.random() * 75) + 1;
        } while (room.calledNumbers.includes(num));

        room.calledNumbers.push(num);
        let letter = num <= 15 ? 'B' : num <= 30 ? 'I' : num <= 45 ? 'N' : num <= 60 ? 'G' : 'O';

        io.to(roomId).emit('number_called', {
            number: num,
            letter: letter,
            callText: `${letter}-${num}`,
            totalCount: room.calledNumbers.length
        });

    }, 4000);
}

function resetRoom(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    clearInterval(room.gameInterval);
    clearInterval(room.countdownInterval);
    room.gameState = 'waiting';
    room.calledNumbers = [];

    setTimeout(() => {
        if (Object.keys(room.players).length >= 2) {
            startRoomCountdown(roomId);
        }
    }, 5000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Real Online Multiplayer Server is running on port ${PORT}`);
});