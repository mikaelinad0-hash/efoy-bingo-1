const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// የጨዋታው ሁኔታ (Game State)
let players = new Set();
let countdownTimer = null;
let countdown = 30;
let gameRunning = false;
let calledNumbers = [];
let drawInterval = null;

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // ተጫዋች ሲቀላቀል
  socket.on('joinGame', () => {
    players.add(socket.id);
    io.emit('playerCountUpdate', players.size);

    // 2 እና ከዛ በላይ ተጫዋች ሲኖር እና ጨዋታው ካልጀመረ የ30 ሰከንድ ቆጠራ ይጀምራል
    if (players.size >= 2 && !gameRunning && !countdownTimer) {
      startCountdown();
    }
  });

  // ተጫዋች ሲወጣ
  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('playerCountUpdate', players.size);

    // ተጫዋች ከ2 በታች ከወረደ ቆጠራው ይቋረጣል
    if (players.size < 2 && countdownTimer && !gameRunning) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      countdown = 30;
      io.emit('statusUpdate', 'በቂ ተጫዋች ስለሌለ ጨዋታው ተሰርዟል፤ ተጫዋች በመጠበቅ ላይ...');
    }
  });
});

// የ 30 ሰከንድ ቆጠራ ማስጀመሪያ function
function startCountdown() {
  countdown = 30;
  io.emit('statusUpdate', `ጨዋታው በ ${countdown} ሰከንድ ውስጥ ይጀምራል...`);

  countdownTimer = setInterval(() => {
    countdown--;
    io.emit('statusUpdate', `ጨዋታው በ ${countdown} ሰከንድ ውስጥ ይጀምራል...`);

    if (countdown <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      startGame();
    }
  }, 1000);
}

// አውቶማቲክ ቁጥር መጥሪያ function
function startGame() {
  gameRunning = true;
  calledNumbers = [];
  io.emit('statusUpdate', 'ጨዋታው ተጀምሯል! መልካም እድል!');

  let availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);

  // በየ 3 ሰከንዱ አውቶማቲክ ቁጥር ይጠራል
  drawInterval = setInterval(() => {
    if (availableNumbers.length === 0) {
      clearInterval(drawInterval);
      io.emit('statusUpdate', 'ሁሉም ቁጥሮች ተጠርተዋል!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const drawnNumber = availableNumbers.splice(randomIndex, 1)[0];
    calledNumbers.push(drawnNumber);

    // ለሁሉም ተጫዋቾች የተጠራውን ቁጥር መላክ
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