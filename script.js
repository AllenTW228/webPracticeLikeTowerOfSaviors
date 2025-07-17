const board = document.getElementById("board");
const rows = 5;
const cols = 6;
const icons = ["🔥", "💧", "🌿", "✨", "🌑", "💗"];

let cells = []; // 儲存畫面上每個 <div> cell 元素的二維陣列
let grid = []; // 儲存實際圖示（emoji）內容的二維陣列

let dragging = false; //是否正在拖曳中
let selected = null; //被拖曳的起始格子
let currentHover = null; // 目前滑鼠經過的格子

class Board {
  constructor(boardElement, rows, cols) {
    this.boardElement = boardElement;
    this.rows = rows;
    this.cols = cols;
    this.init();
  }

  randomIcon() {
    const i = Math.floor(Math.random() * this.icons.length);
    return this.icons[i];
  }

  init() {
    this.boardElement.innerHTML = ""; // 清空畫面
    this.grid = Array.from({ length: this.rows }, (_, r) => {
      return Array.from({ length: this.cols }, (_, c) => {
        const el = document.createElement("div");
        el.className = "cell";
        const icon = this.randomIcon();
        el.textContent = icon;
        this.boardElement.appendChild(el);
        return new Cell(r, c, icon, el);
      });
    });
  }
}
class Cell {
  constructor(row, col, icon, el) {
    this.row = row;
    this.col = col;
    this.icon = icon;
    this.el = el;
    this.hVisited = false;
    this.vVisited = false;
  }

  resetVisited() {
    this.hVisited = false;
    this.vVisited = false;
  }

  setIcon(icon) {
    this.icon = icon;
    this.el.textContent = icon || "";
  }
}

function randomIcon() { // 從 icons 中隨機選一個符號（用來填格子）
  return icons[Math.floor(Math.random() * icons.length)];
}

function createBoard() {
  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const icon = randomIcon();
      cell.textContent = icon;
      cell.dataset.row = r; // 命名規則：HTML 裡是：data-row；JavaScript 裡是：dataset.row（會自動轉成 camelCase）
      cell.dataset.col = c; // 記錄 DOM 元素的額外資訊
      board.appendChild(cell);
      cells[r][c] = cell;
      grid[r][c] = icon;
    }
  }
}

function getRC(elem) { // 取得某個格子的 row 和 col 資訊
  return [parseInt(elem.dataset.row), parseInt(elem.dataset.col)];
} //elem.dataset.row 是字串，parseInt() 轉成數字。

function swap(r1, c1, r2, c2) { // 交換兩個格子的內容，包含邏輯上的 grid 和畫面上的 textContent。
  let temp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = temp;

  let tempText = cells[r1][c1].textContent;
  cells[r1][c1].textContent = cells[r2][c2].textContent;
  cells[r2][c2].textContent = tempText;
}

function detectMatches() {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const groups = [];
  function isInBounds(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols;
  } 
  function dfs(r, c, icon, group) { 
    // 範圍外、已拜訪、不同 icon：跳過
    if (!isInBounds(r, c)) return; 
    if (visited[r][c]) return;
    if (grid[r][c] !== icon) return; // 改成上下、左右icon不同、上下左右2個icon不同者
 
    visited[r][c] = true;
    group.push([r, c]); //group 是一個set(不存重複值)
    // 根據way方向做if & 其方向是否同色
    // h
      // check color
    dfs(r + 1, c, icon, group); 
      // check color
    dfs(r - 1, c, icon, group);
    // v
      // check color
    dfs(r, c + 1, icon, group);
      // check color
    dfs(r, c - 1, icon, group);
  }
  // 以下要大改
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!visited[r][c] && grid[r][c]) { // cell有visited 屬性
        const group = [];
        dfs(r, c, grid[r][c], group);
        if (group.length >= 3 && isValidGroup(group)) {
          groups.push(group);
        }
      }
    }
  }

  // 執行消除
  for (const group of groups) {
    for (const [r, c] of group) {
      grid[r][c] = null;
      cells[r][c].textContent = "";
      cells[r][c].classList.add("clearing");
    }
  }

  return groups.length > 0;
}
function isValidGroup(group) {
  const rowsMap = new Map();
  const colsMap = new Map();

  for (const [r, c] of group) {
    if (!rowsMap.has(r)) rowsMap.set(r, []);
    if (!colsMap.has(c)) colsMap.set(c, []);
    rowsMap.get(r).push(c);
    colsMap.get(c).push(r);
  }

  // 檢查橫列中是否有連續 >= 3
  for (const [_, cols] of rowsMap) {
    if (hasConsecutive(cols, 3)) return true;
  }

  // 檢查直行中是否有連續 >= 3
  for (const [_, rows] of colsMap) {
    if (hasConsecutive(rows, 3)) return true;
  }

  return false;
}

function hasConsecutive(arr, minLength) {
  if (arr.length < minLength) return false;

  arr.sort((a, b) => a - b);
  let count = 1;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] + 1) {
      count++;
      if (count >= minLength) return true;
    } else {
      count = 1;
    }
  }

  return false;
}



function dropGems() {
  for (let c = 0; c < cols; c++) {
    let pointer = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r][c] !== null) {
        grid[pointer][c] = grid[r][c];
        cells[pointer][c].textContent = grid[r][c];
        pointer--;
      }
    }
    for (let r = pointer; r >= 0; r--) {
      grid[r][c] = randomIcon();
      cells[r][c].textContent = grid[r][c];
    }
  }

  // 🔧 補珠後，移除所有 .clearing 樣式
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells[r][c].classList.remove("clearing");
    }
  }
}


function processChain() {
  let matched = detectMatches();
  if (matched) {
    setTimeout(() => {
        dropGems();
        setTimeout(processChain, 600);
    }, 600);
  }
}

// 拖曳事件
board.addEventListener("mousedown", (e) => {
  if (e.target.classList.contains("cell")) {
    dragging = true;
    selected = e.target;
    selected.classList.add("dragging");
  }
});

board.addEventListener("mousemove", (e) => {
  if (!dragging || !selected) return;
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (target && target.classList.contains("cell") && target !== selected) {
    const [r1, c1] = getRC(selected);
    const [r2, c2] = getRC(target);
   if (Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) === 1) {
      swap(r1, c1, r2, c2);
      selected.classList.remove("dragging");
      target.classList.add("dragging");
      selected = target;
      currentHover = target;
    }
  }
});

document.addEventListener("mouseup", () => {
  dragging = false;
  if (selected) selected.classList.remove("dragging");
  if (currentHover) currentHover.classList.remove("dragging");
  selected = null;
  currentHover = null;

  processChain();
});

createBoard();
const gameDuration = 30; // 秒數
let timerInterval = null;
let currentTime = gameDuration;
const timerBar = document.getElementById("timer-bar");

function updateTimerBarColor() {
  // 設定時間條顏色 (綠→黃→紅)
  const ratio = currentTime / gameDuration;
  let r, g, b = 0;
  if (ratio > 0.5) {
    r = Math.floor(255 * (1 - (ratio - 0.5) * 2));
    g = 255;
  } else {
    r = 255;
    g = Math.floor(255 * (ratio * 2));
  }
  timerBar.style.backgroundColor = `rgb(${r},${g},${b})`;
}

// 重置計時器（但不啟動倒數）
function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  currentTime = gameDuration;
  timerBar.style.width = "100%";
  updateTimerBarColor();
}

// 開始倒數（需先呼叫 resetTimer 重置時間）
function runTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    currentTime--;
    const percent = (currentTime / gameDuration) * 100;
    timerBar.style.width = percent + "%";
    updateTimerBarColor();

    if (currentTime <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      console.log("時間到! 強制消除");
      processChain(); // 時間到強制執行消除
    }
  }, 1000);
}

