// === DOM ELEMENTS ===
const box = [];
const whose_turn_el = document.getElementById("whose-turn");
const reset_el = document.getElementById("reset");
const x_score_el = document.getElementById("p-x-score");
const o_score_el = document.getElementById("p-o-score");
const setting_btn = document.getElementById("setting");
const model_container = document.getElementById("model-box-container");
const model_box = document.getElementById("model-box");
const mute_btn = document.getElementById("mute");
const mute_icon_span = document.getElementById("mute-icon");
const winner_modal = document.getElementById("winner-modal");
const winner_text = document.getElementById("winner-text");
const close_modal = document.getElementById("close-modal");
const mode_switch = document.getElementById("mode-switch");
const mode_label = document.getElementById("mode-label");

// === VARIABLES ===
let is_x_turn = true;
let game_board = [];
let has_won = false;
let mute = false;
let isSinglePlayer = mode_switch?.checked ?? true;

// === AUDIO ===
const clickSound = new Audio("../assets/audio/click.wav");
const winSound = new Audio("../assets/audio/win.wav");
const resetSound = new Audio("../assets/audio/reset.wav");
const fireworkSound = new Audio("../assets/audio/firework.mp3");

function playClickSound() {
  if (!mute && !has_won) clickSound.play();
}
function playWinSound() {
  if (!mute || !has_won) winSound.play();
}
function playResetSound() {
  if (!mute || !has_won) resetSound.play();
}
function playFireworkSound() {
  if (!mute) fireworkSound.play();
}

// === GAME LOGIC ===
function newGameBoard() {
  game_board = Array.from({ length: 3 }, () => Array(3).fill(null));
}

function checkForWinner(current_player) {
  const win_color = current_player === "X" ? "blue" : "red";
  const winPatterns = [
    [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]]
  ];

  for (const pattern of winPatterns) {
    const [a,b,c] = pattern;
    if (
      game_board[a[0]][a[1]] === current_player &&
      game_board[b[0]][b[1]] === current_player &&
      game_board[c[0]][c[1]] === current_player
    ) {
      const winningIndices = pattern.map(([i,j]) => i*3 + j);
      winningIndices.forEach(idx => box[idx].style.backgroundColor = win_color);
      return true;
    }
  }
  return false;
}

function showWinnerPopup(player) {
  const icon = player === "X" ? "❌" : "⭕️";
  winner_text.innerHTML = `<div style="font-size: 3rem;">${icon}</div><div><strong>Player ${player} Wins!</strong></div>`;
  winner_modal.style.display = "flex";
}

function launchConfetti(color) {
  playFireworkSound();
  const duration = 2000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 999,
    colors: [color, "#ffffff"]
  };
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    confetti(Object.assign({}, defaults, {
      particleCount: 50 * (timeLeft / duration),
      origin: { x: Math.random(), y: Math.random() - 0.2 }
    }));
  }, 250);
}

function resetGameBoard() {
  playResetSound();
  box.forEach(el => {
    el.textContent = "";
    el.style.backgroundColor = "transparent";
  });
  newGameBoard();
  has_won = false;
  is_x_turn = true;
  whose_turn_el.textContent = "X";
  winner_modal.style.display = "none";
}

function makeAIMove() {
  if (has_won) return;

  const ai = "O";
  const human = "X";

  // 1. Try to win
  let move = findBestMove(ai);
  if (!move) {
    // 2. Try to block player win
    move = findBestMove(human);
  }
  if (!move) {
    // 3. Pick center
    if (!game_board[1][1]) move = [1, 1];
  }
  if (!move) {
    // 4. Pick a corner
    const corners = [[0,0],[0,2],[2,0],[2,2]];
    move = corners.find(([i, j]) => !game_board[i][j]);
  }
  if (!move) {
    // 5. Pick any side
    const sides = [[0,1],[1,0],[1,2],[2,1]];
    move = sides.find(([i, j]) => !game_board[i][j]);
  }

  if (move) {
    const [i, j] = move;
    const boxIndex = i * 3 + j;
    const targetBox = box[boxIndex];

    if (targetBox.textContent === "") {
      playClickSound();
      targetBox.textContent = ai;
      targetBox.style.color = "red";
      game_board[i][j] = ai;

      if (checkForWinner(ai)) {
        has_won = true;
        playWinSound();
        launchConfetti("red");
        showWinnerPopup(ai);
        o_score_el.textContent = parseInt(o_score_el.textContent) + 1;
      }

      is_x_turn = true;
      whose_turn_el.textContent = "X";
    }
  }
}

function findBestMove(player) {
  const winPatterns = [
    [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]]
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    const cells = [game_board[a[0]][a[1]], game_board[b[0]][b[1]], game_board[c[0]][c[1]]];
    const count = cells.filter(cell => cell === player).length;
    const emptyIndex = cells.findIndex(cell => cell === null);

    if (count === 2 && emptyIndex !== -1) {
      const emptyCoord = pattern[emptyIndex];
      return emptyCoord;
    }
  }
  return null;
}

function handlePlayerMove(event, i) {
  if (has_won || event.target.textContent !== "") return;

  playClickSound();
  const current_player = is_x_turn ? "X" : "O";
  event.target.textContent = current_player;
  event.target.style.color = current_player === "X" ? "blue" : "red";

  const row = Math.floor(i / 3);
  const col = i % 3;
  game_board[row][col] = current_player;

  // Check for winner
  if (checkForWinner(current_player)) {
    has_won = true;
    playWinSound();
    launchConfetti(current_player === "X" ? "blue" : "red");
    showWinnerPopup(current_player);
    current_player === "X"
      ? x_score_el.textContent = parseInt(x_score_el.textContent) + 1
      : o_score_el.textContent = parseInt(o_score_el.textContent) + 1;
    return; // Exit here, no need to check for tie or AI move
  }

  // ✅ Check for draw/tie and auto-restart
if (game_board.flat().every(cell => cell)) {
  winner_text.innerHTML = `<div style="font-size: 2rem;">🤝</div><div><strong>It's a Draw!</strong></div>`;
  winner_modal.style.display = "flex";

  // Auto-restart after 3 seconds
  setTimeout(() => {
    winner_modal.style.display = "none";
    resetGameBoard();
  }, 3000);
  return;
}


  // Switch turn if game continues
  is_x_turn = !is_x_turn;
  whose_turn_el.textContent = is_x_turn ? "X" : "O";

  // Trigger AI move if single-player mode and it's AI's turn
  if (isSinglePlayer && !is_x_turn && !has_won) {
    setTimeout(() => {
      if (!has_won) makeAIMove();
    }, 300);
  }
}



// === INIT ===
function startGame() {
  newGameBoard();
  for (let i = 1; i <= 9; i++) {
    const el = document.getElementById("box" + i);
    box.push(el);
    el.addEventListener("click", (e) => handlePlayerMove(e, i - 1));
  }
}

// === EVENT LISTENERS ===
reset_el.addEventListener("click", resetGameBoard);
setting_btn.addEventListener("click", () => model_container.style.display = "flex");
model_container.addEventListener("click", () => model_container.style.display = "none");
model_box.addEventListener("click", e => e.stopPropagation());
close_modal.addEventListener("click", () => winner_modal.style.display = "none");

mute_btn.addEventListener("click", () => {
  mute = !mute;
  mute_icon_span.classList.toggle("not-in-mute", !mute);
  mute_icon_span.classList.toggle("in-mute", mute);
});

mode_switch?.addEventListener("change", () => {
  isSinglePlayer = mode_switch.checked;
  mode_label.textContent = isSinglePlayer ? "🧠 AI Mode" : "🧑‍🤝‍🧑 2-Player Mode";
  resetGameBoard();
});

startGame();
