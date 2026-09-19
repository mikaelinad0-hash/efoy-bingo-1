const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// የሎቢ እና የጨዋታ ሁኔታዎች
let lobbyPlayers = new Map(); // socket.id -> player info
let countdownTimer = null;
let countdown = 30;
let gameRunning = false;
let calledNumbers = [];
let drawInterval = null;

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // ተጫዋች ሎቢ ሲቀላቀል
  socket.on('joinLobby', (data) => {
    lobbyPlayers.set(socket.id, {
      id: socket.id,
      cardCount: data.cardCount || 1,
      ready: true
    });

    // የሎቢ ተጫዋቾች ብዛትን ለሁሉም መላክ
    io.emit('lobbyUpdate', {
      playerCount: lobbyPlayers.size,
      status: `ተጫዋቾች: ${lobbyPlayers.size} (ቢያንስ 2 ተጫዋች ያስፈልጋል)`
    });

    // 2 እና ከዛ በላይ ተጫዋች ሲሞላ የ 30 ሰከንድ ቆጠራ ይጀምራል
    if (lobbyPlayers.size >= 2 && !gameRunning && !countdownTimer) {
      start30SecCountdown();
    }
  });

  // ተጫዋች ከሎቢ ሲወጣ
  socket.on('disconnect', () => {
    lobbyPlayers.delete(socket.id);

    io.emit('lobbyUpdate', {
      playerCount: lobbyPlayers.size,
      status: `ተጫዋቾች: ${lobbyPlayers.size}`
    });

    // ተጫዋች ከ2 በታች ከወረደ ቆጠራው ይቋረጣል
    if (lobbyPlayers.size < 2 && countdownTimer && !gameRunning) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      countdown = 30;
      io.emit('countdownCancel', 'በቂ ተጫዋች የለም፤ ሌላ ተጫዋች በመጠበቅ ላይ...');
    }
  });
});

// የ 30 ሰከንድ ቆጠራ function
function start30SecCountdown() {
  countdown = 30;
  io.emit('countdownTick', countdown);

  countdownTimer = setInterval(() => {
    countdown--;
    io.emit('countdownTick', countdown);

    if (countdown <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      startGameSession();
    }
  }, 1000);
}

// ጨዋታ ማስጀመሪያ function
function startGameSession() {
  gameRunning = true;
  calledNumbers = [];

  // ለሁሉም ተጫዋቾች ጨዋታው መጀመሩን ማሳወቅ (ወደ Game View ያዛውራቸዋል)
  io.emit('gameStarted');

  let availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);

  // በየ 3 ሰከንዱ አውቶማቲክ ቁጥር መጥራት
  drawInterval = setInterval(() => {
    if (availableNumbers.length === 0) {
      clearInterval(drawInterval);
      io.emit('statusUpdate', 'ሁሉም ቁጥሮች ተጠርተዋል!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const drawnNumber = availableNumbers.splice(randomIndex, 1)[0];
    calledNumbers.push(drawnNumber);

    io.emit('numberDrawn', {
      number: drawnNumber,
      count: calledNumbers.length,
      allCalled: calledNumbers
    });
  }, 3000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});