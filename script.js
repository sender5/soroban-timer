// 押されているキー一覧
const activeKeys = new Set();

function speak(text, pitch, callback = null) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.pitch = pitch;
  utter.rate = 1.0;
  utter.onend = () => callback && callback();

  // cancel() は使わない（他タイマーが止まるため）
  speechSynthesis.speak(utter);
}

class Timer {
  constructor(id, startKey, stopKey, resetKey, pitch) {
    this.id = id;
    this.startKey = startKey.toLowerCase();
    this.stopKey = stopKey.toLowerCase();
    this.resetKey = resetKey.toLowerCase();
    this.pitch = pitch;

    this.timer = null;
    this.breakTimer = null;
    this.remaining = 0;
    this.firstStart = true;

    this.buildUI();
    this.attachKeyboard();
  }

  buildUI() {
    const container = document.getElementById("timers-container");

    this.box = document.createElement("div");
    this.box.className = "timer-box";

    this.title = document.createElement("div");
    this.title.className = "timer-title";
    this.title.textContent = `タイマー${this.id}`;

    this.hideBtn = document.createElement("button");
    this.hideBtn.textContent = "非表示";
    this.hideBtn.className = "hide-btn";
    this.hideBtn.onclick = () => this.hideTimer();

    this.display = document.createElement("div");
    this.display.className = "display";
    this.display.textContent = "00:00";

    this.message = document.createElement("div");
    this.message.className = "message";
    this.message.textContent = "待機中";

    this.minInput = document.createElement("input");
    this.minInput.type = "number";
    this.minInput.value = 0;

    this.secInput = document.createElement("input");
    this.secInput.type = "number";
    this.secInput.value = 0;

    this.minInput.oninput = () => this.updateDisplayFromInput();
    this.secInput.oninput = () => this.updateDisplayFromInput();

    this.endless = document.createElement("input");
    this.endless.type = "checkbox";
    this.endless.checked = true;   // 初期オン

    const inputRow = document.createElement("div");
    inputRow.className = "input-row";
    inputRow.append(this.minInput, " 分　", this.secInput, " 秒");

    const endlessRow = document.createElement("div");
    endlessRow.className = "endless-row";
    endlessRow.append("エンドレス ", this.endless);

    const btnRow = document.createElement("div");
    btnRow.className = "buttons";

    this.startBtn = document.createElement("button");
    this.startBtn.textContent = "スタート";
    this.startBtn.className = "start-btn";
    this.startBtn.onclick = () => this.startTimer();

    this.stopBtn = document.createElement("button");
    this.stopBtn.textContent = "ストップ";
    this.stopBtn.className = "stop-btn";
    this.stopBtn.onclick = () => this.stopTimer();

    this.resetBtn = document.createElement("button");
    this.resetBtn.textContent = "リセット";
    this.resetBtn.className = "reset-btn";
    this.resetBtn.onclick = () => this.resetTimer();

    btnRow.append(this.startBtn, this.stopBtn, this.resetBtn);

    this.box.append(
      this.hideBtn,
      this.title,
      this.display,
      this.message,
      inputRow,
      endlessRow,
      btnRow
    );

    container.append(this.box);
  }

  updateDisplayFromInput() {
    const min = parseInt(this.minInput.value) || 0;
    const sec = parseInt(this.secInput.value) || 0;
    const total = min * 60 + sec;
    this.display.textContent = this.format(total);
    this.remaining = total;
  }

  hideTimer() {
    this.box.style.display = "none";

    const hiddenList = document.getElementById("hidden-list");
    const btn = document.createElement("button");
    btn.textContent = `${this.id}番タイマーを表示`;
    btn.onclick = () => {
      this.box.style.display = "block";
      btn.remove();
    };
    hiddenList.append(btn);
  }

  attachKeyboard() {
    document.addEventListener("keydown", (e) => {
      activeKeys.add(e.key.toLowerCase());

      // スタートキーが押されたら即スタート
      if (e.key.toLowerCase() === this.startKey) {
        this.startTimer();
      }

      // 停止キー
      if (e.key.toLowerCase() === this.stopKey) {
        this.stopTimer();
      }

      // リセットキー
      if (e.key.toLowerCase() === this.resetKey) {
        this.resetTimer();
      }
    });

    document.addEventListener("keyup", (e) => {
      activeKeys.delete(e.key.toLowerCase());
    });
  }

  format(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  startTimer() {
    if (this.timer || this.breakTimer) return;

    const min = parseInt(this.minInput.value);
    const sec = parseInt(this.secInput.value);

    this.remaining = min * 60 + sec;
    if (this.remaining <= 0) return;

    this.display.classList.remove("blue");
    this.message.textContent = "";

    // 毎回「準備ができました」を言う
    speak(`${this.id}番スタートの準備ができました`, this.pitch, () => {
      const speakText =
        min > 0 && sec > 0
          ? `${min}分${sec}秒 用意はじめ`
          : min > 0
          ? `${min}分 用意はじめ`
          : `${sec}秒 用意はじめ`;

      this.message.textContent = "用意はじめ";

      speak(speakText, this.pitch, () => {
        this.runTimer();
      });
    });
  }

  runTimer() {
    this.timer = setInterval(() => {
      this.remaining--;
      this.display.textContent = this.format(this.remaining);
      this.message.textContent = "カウントダウン中";

      if (this.remaining <= 0) {
        clearInterval(this.timer);
        this.timer = null;

        speak("やめ", this.pitch);
        this.message.textContent = "やめ";
        this.display.textContent = "00:00";

        setTimeout(() => {
          if (this.endless.checked) this.startBreak();
        }, 1000);
      }
    }, 1000);
  }

  startBreak() {
    let breakTime = 15;

    this.message.textContent = "巻き戻し中";
    this.display.classList.add("blue");

    this.breakTimer = setInterval(() => {
      breakTime--;
      this.display.textContent = this.format(breakTime);

      if (breakTime <= 0) {
        clearInterval(this.breakTimer);
        this.breakTimer = null;

        const min = parseInt(this.minInput.value);
        const sec = parseInt(this.secInput.value);

        this.message.textContent = "準備中";
        this.display.classList.remove("blue");
        this.display.textContent = this.format(min * 60 + sec);

        setTimeout(() => {
          // 2回目以降も準備アナウンスを言う
          this.startTimer();
        }, 1000);
      }
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.timer);
    clearInterval(this.breakTimer);
    this.timer = null;
    this.breakTimer = null;
  }

  resetTimer() {
    this.stopTimer();
    this.remaining = 0;
    this.display.classList.remove("blue");
    this.message.textContent = "待機中";
    this.display.textContent = "00:00";
    this.minInput.value = 0;
    this.secInput.value = 0;
  }
}

/* 5つのタイマー生成（声の高さも指定） */
new Timer(1, "F1", "q", "a", 1.0);
new Timer(2, "F2", "w", "s", 1.3);
new Timer(3, "F3", "e", "d", 0.7);
new Timer(4, "F4", "r", "f", 1.6);
new Timer(5, "F5", "t", "g", 0.5);
