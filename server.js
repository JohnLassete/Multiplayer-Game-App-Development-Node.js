const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const port = process.env.PORT || 3000;
let gameRooms = {};

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.use(express.static(__dirname + "/public"));

io.on("connection", (socket) => {
  console.log("A user connected!");

  socket.on("joinGame", (data) => {
    if (!gameRooms[data.roomId]) {
      gameRooms[data.roomId] = {
        players: [],
        gameState: initializeGameBoard(),
        currentPlayer: 0,
      };
    }

    gameRooms[data.roomId].players.push(data.username);
    socket.join(data.roomId);
    console.log(`${data.username} joined the game ${data.roomId}`);

    socket.broadcast.to(data.roomId).emit("message", {
      username: "Server",
      message: `${data.username} has joined the game!`,
    });

    socket.emit("gameState", gameRooms[data.roomId]);
  });

  socket.on("makeMove", (data) => {
    const room = gameRooms[data.roomId];
    if (!room) return;

    const { row, col } = data.move;

    if (isMoveValid(room.gameState, row, col)) {
      room.gameState[row][col] = room.currentPlayer === 0 ? "X" : "O";
      room.currentPlayer = 1 - room.currentPlayer;

      io.in(data.roomId).emit("gameState", room);

      if (checkWinner(room.gameState)) {
        io.in(data.roomId).emit("message", {
          username: "Server",
          message: `${room.players[room.currentPlayer]} wins!`,
        });
      }
    } else {
      socket.emit("message", {
        username: "Server",
        message: "Invalid move, try again!",
      });
    }
  });

  socket.on("chatMessage", (data) => {
    console.log(`${data.username}: ${data.message}`);
    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected!");
  });
});

http.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

function initializeGameBoard() {
  return [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
}

function isMoveValid(gameState, row, col) {
  return gameState[row][col] === "";
}

function checkWinner(gameState) {
  const lines = [
    // Rows
    [gameState[0][0], gameState[0][1], gameState[0][2]],
    [gameState[1][0], gameState[1][1], gameState[1][2]],
    [gameState[2][0], gameState[2][1], gameState[2][2]],
    // Columns
    [gameState[0][0], gameState[1][0], gameState[2][0]],
    [gameState[0][1], gameState[1][1], gameState[2][1]],
    [gameState[0][2], gameState[1][2], gameState[2][2]],
    // Diagonals
    [gameState[0][0], gameState[1][1], gameState[2][2]],
    [gameState[0][2], gameState[1][1], gameState[2][0]],
  ];

  for (const line of lines) {
    if (line[0] && line[0] === line[1] && line[1] === line[2]) {
        return true;
    }
  }
  return false;
}
