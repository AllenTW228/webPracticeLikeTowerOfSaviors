class Board {
    constructor(boardElement, rows, cols) {
        this.boardElement = boardElement;
        this.rows = rows;
        this.cols = cols;
        this.icons = ["🔥", "💧", "🌿", "✨", "🌑", "💗"]; // 加上這行
        this.grid = []; // 儲存 Cell 二維陣列
        this.deleteGroup = []
        // 建立來源方向陣列常數
        this.srcDIRS = {
          right: [1, 0, 0, 0],
          left: [0, 1, 0, 0],
          up: [0, 0, 1, 0],
          down: [0, 0, 0, 1]
        };
        this.init(); // 初始化
        this.setupDragHandlers();// 為cells設定滑鼠事件監聽
    }
    static Cell = class {
        constructor(row, col, icon, el) {
          this.row = row;
          this.col = col;
          this.icon = icon;
          this.el = el;
          this.visited = false;
        }
        setIcon(icon) {
          this.icon = icon;
          this.el.textContent = icon || "";
        }
        setVisited(state) {
          this.visited = state;
        }
        resetVisited() { //重置Visted
          this.visited = false;
        }
        // 為每個cell加入事件監聽器；點擊事件設定器
        addEventListeners(onMouseDown, onMouseEnter, onMouseUp) {
          this.el.addEventListener("mousedown", () => onMouseDown(this));
          this.el.addEventListener("mouseenter", (e) => {
            if (e.buttons === 1) onMouseEnter(this); // 只有按住滑鼠左鍵才換
          });
          this.el.addEventListener("mouseup", () => onMouseUp(this));
        }
    }
    randomIcon() { // 隨機icon
        const i = Math.floor(Math.random() * this.icons.length);
        return this.icons[i];
    }
    init() { //初始化
        this.boardElement.innerHTML = ""; // 清空 DOM
        this.grid = Array.from({ length: this.rows }, (_, r) =>
        Array.from({ length: this.cols }, (_, c) => {
            const el = document.createElement("div");
            el.className = "cell";
            const icon = this.randomIcon();
            el.textContent = icon;
            this.boardElement.appendChild(el);
            return new Board.Cell(r, c, icon, el);
          })
        );
    }
    setupDragHandlers() {
      let selected = null;

      const onMouseDown = (cell) => {
        selected = cell;
        cell.el.classList.add("dragging"); // ✅ 加入 dragging 動畫效果
      };

      const onMouseEnter = (target) => {
        if (selected && target !== selected) {
          this.swapIcons(selected, target);
          selected.el.classList.remove("dragging");
          target.el.classList.add("dragging");
          selected = target;
        }
      };

      const onMouseUp = () => {
        if (selected) {
          selected.el.classList.remove("dragging"); // ✅ 結束拖曳時移除動畫
          selected = null;
        }
        // 做連鎖消除用
        this.processChain();
        // 為cells 加入滑鼠事件
        // this.setupDragHandlers();
      }

      // 為所有 cell 註冊事件
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          this.grid[r][c].addEventListeners(onMouseDown, onMouseEnter, onMouseUp);
        }
      }
    }

    getCell(r, c) { // 取得cell address
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
        return this.grid[r][c];
    }
    swapIcons(cell1, cell2) { // 移動cell，並交換icon
      const temp = cell1.icon;
      cell1.setIcon(cell2.icon);
      cell2.setIcon(temp);
    }
    resetVisited() { // 重置消演算法中的，cell中vVisted, hVisted重置
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c].resetVisited();
            }
        }
    }

    // 方向翻轉（禁止從反方向再擴散）；ex：[1,0,0,0] -> [0,1,1,1]；way是來源方向；[下]
    invertWay(way) {
      return way.map(val => val === 1 ? 0 : 1);
    }
    isInBounds(r, c) { // 檢查r, c是否在board中cells範圍內
      return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }
    async deleteMatch() {
      this.deleteGroup = []; // 初始化

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = this.grid[r][c];
          let matchedSet = new Set()
          if (!cell.visited && cell) {
            cell.setVisited(true);
            const icon = cell.icon;
            this.dfs(r, c-1, icon, this.srcDIRS.right, matchedSet);// 向left
            this.dfs(r, c+1, icon, this.srcDIRS.left, matchedSet);// 向right
            this.dfs(r+1, c, icon, this.srcDIRS.up, matchedSet);// 向down
            this.dfs(r-1, c, icon, this.srcDIRS.down, matchedSet);// 向up
          }
          if (matchedSet.size > 0) {
            this.deleteGroup.push(matchedSet);
            console.log('this.deleteGroup：',this.deleteGroup)
          }
        }
      }
      // 🔥 清除 matched 所有格子(未分組)
      console.log(1,this.deleteGroup)
      for (const posSet of this.deleteGroup) {
        for(const pos of posSet){
          const [r, c] = pos.split(",").map(Number);
          this.grid[r][c].setIcon(null);
          this.grid[r][c].el.classList.add("clearing");
        }
         // 等待動畫時間 0.5 秒
        await new Promise(resolve => setTimeout(resolve, 200));
      }   
      console.log('this.deleteGroup.size：', this.deleteGroup.length) 
      return this.deleteGroup.length
    }
    dfs(r, c, icon, way, matchedSet) { // deleteMatch 作為擴散搜尋用的
      console.log('dfs：',[r,c]);
      if (!this.isInBounds(r, c)) return 1;
      if (this.grid[r][c].visited) return 2;
      if (this.grid[r][c].icon !== icon) return 3;
      //console.log('dfs：',[r,c]);
      // 🔍 先檢查是否上下或左右都與自己一樣
      const up    = this.isInBounds(r - 1, c) && this.grid[r - 1][c].icon === icon;

      const down  = this.isInBounds(r + 1, c) && this.grid[r + 1][c].icon === icon;
      
      const left  = this.isInBounds(r, c - 1) && this.grid[r][c - 1].icon === icon;
      
      const right = this.isInBounds(r, c + 1) && this.grid[r][c + 1].icon === icon;
     
      
      const hasVerticalMatch = up && down;
      const hasHorizontalMatch = left && right;

      if (!hasVerticalMatch && !hasHorizontalMatch) return; // ⛔ 不構成消除條件

      // ✅ 構成 match，加入自己與相鄰格
    // 未組成一組集合，放入陣列
      this.grid[r][c].setVisited(true);
      matchedSet.add(`${r},${c}`);

      if (hasVerticalMatch) {
        matchedSet.add(`${r - 1},${c}`);
        console.log('matchedSet1：',matchedSet);
        matchedSet.add(`${r + 1},${c}`);
        console.log('matchedSet2：',matchedSet);
      }
      if (hasHorizontalMatch) {
        matchedSet.add(`${r},${c - 1}`);
        console.log('matchedSet3：',matchedSet);
        matchedSet.add(`${r},${c + 1}`);
        console.log('matchedSet4：',matchedSet);
      }
    //看要不改存陣列(若用set，則不能用陣列)

      // 🔁 翻轉方向，避免往回擴散
      const newWay = this.invertWay(way);
      console.log('newWay',newWay);
      if (newWay[0]) this.dfs(r , c+1, icon, this.srcDIRS.left, matchedSet) // 向右
      if (newWay[1]) this.dfs(r , c-1, icon, this.srcDIRS.right, matchedSet)// 向左
      if (newWay[2]) this.dfs(r-1, c , icon, this.srcDIRS.down, matchedSet) // 向上
      if (newWay[3]) this.dfs(r+1, c , icon, this.srcDIRS.up, matchedSet) // 向下
    }
    dropGems() {
      for (let c = 0; c < this.cols; c++) {
        let pointer = this.rows - 1;

        // 把非空珠子往下移
        for (let r = this.rows - 1; r >= 0; r--) {
        const cell = this.grid[r][c];
        if (cell.icon !== null) {
            const targetCell = this.grid[pointer][c];
            targetCell.setIcon(cell.icon);
            pointer--;
        }
        }

        // 補新的珠子
        for (let r = pointer; r >= 0; r--) {
        const icon = this.randomIcon();
        this.grid[r][c].setIcon(icon);
        }
    }

        // 移除所有 .clearing 樣式
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              this.grid[r][c].el.classList.remove("clearing");
            }
        }
    }
    async processChain() { // 做連鎖消除用
      let matchedCount = await this.deleteMatch();
      if (matchedCount>0) {
        setTimeout(() => {
            this.dropGems();
            this.resetVisited(); // 重置cells visited = false
            setTimeout(() => this.processChain(), 600);
        }, 600);
      }
    this.resetVisited(); // 重置cells visited = false
    }
  }




// main
const boardEl = document.getElementById("board");
const gameBoard = new Board(boardEl, 5, 6);

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

