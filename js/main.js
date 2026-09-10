// ===== main.js =====
// 부팅, 게임 루프(고정 timestep), 상태 머신.
(function (BB) {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // --- 게임 전체 상태 ---
  BB.game = {
    state: 'BOOT',        // BOOT / TITLE / PLAYING / ROUND_CLEAR / MISS / GAME_OVER / ENDING
    score: 0,
    hiScore: 0,
    lives: 3,
    round: 1,
    loadProgress: 0,
    stateTime: 0,         // 지금 상태로 바뀐 뒤 흐른 시간(초)
    paused: false,
    setState: function (s) { this.state = s; this.stateTime = 0; }
  };

  // 최고 점수 불러오기
  try {
    BB.game.hiScore = parseInt(localStorage.getItem('bb_hiscore') || '0', 10) || 0;
  } catch (e) { /* file:// 등에서 막히면 무시 */ }

  // --- 화면 정수배 확대 ---
  function resize() {
    var scale = Math.max(1, Math.floor(Math.min(
      window.innerWidth / BB.CONFIG.VW,
      window.innerHeight / BB.CONFIG.VH
    )));
    canvas.style.width = (BB.CONFIG.VW * scale) + 'px';
    canvas.style.height = (BB.CONFIG.VH * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // --- 에셋 로드 후 타이틀로 ---
  BB.assets.load(function (p) { BB.game.loadProgress = p; }).then(function () {
    BB.game.setState('TITLE');
  });

  // --- 라운드 로드 (M2에서 BB.Level / BB.LEVELS 생기면 동작) ---
  function loadRound(n) {
    if (!BB.LEVELS || !BB.Level || !BB.Player) return;
    var def = BB.LEVELS[n - 1] || BB.LEVELS[0];
    BB.level = new BB.Level(def);
    BB.player = new BB.Player(BB.level.playerStart.x, BB.level.playerStart.y);
  }
  BB.loadRound = loadRound;

  function startGame() {
    BB.game.score = 0;
    BB.game.lives = 3;
    BB.game.round = 1;
    loadRound(1);
    BB.game.setState('PLAYING');
  }

  // --- 업데이트 ---
  function update(dt) {
    BB.game.stateTime += dt;
    var s = BB.game.state;

    if (s === 'TITLE') {
      if (BB.input.pressed('bubble') || BB.input.pressed('start')) startGame();

    } else if (s === 'PLAYING') {
      if (BB.input.pressed('pause')) BB.game.paused = !BB.game.paused;
      if (BB.game.paused) return;
      if (BB.level && BB.level.update) BB.level.update(dt);
      if (BB.player && BB.player.update) BB.player.update(dt, BB.level);
    }
  }

  // --- 그리기 ---
  function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, BB.CONFIG.VW, BB.CONFIG.VH);
    var s = BB.game.state;

    if (s === 'BOOT') {
      text('로딩... ' + Math.round(BB.game.loadProgress * 100) + '%', BB.CONFIG.VW / 2, BB.CONFIG.VH / 2);

    } else if (s === 'TITLE') {
      text('버블보블', BB.CONFIG.VW / 2, BB.CONFIG.VH / 2 - 20, 24);
      text('PUSH SPACE', BB.CONFIG.VW / 2, BB.CONFIG.VH / 2 + 20);
      text('최고 점수  ' + BB.game.hiScore, BB.CONFIG.VW / 2, BB.CONFIG.VH / 2 + 44, 10);

    } else if (s === 'PLAYING') {
      if (BB.level && BB.level.draw) BB.level.draw(ctx);
      if (BB.player && BB.player.draw) BB.player.draw(ctx);
      if (BB.game.paused) text('일시정지', BB.CONFIG.VW / 2, BB.CONFIG.VH / 2, 16);
    }
  }

  function text(str, x, y, size) {
    ctx.fillStyle = '#fff';
    ctx.font = (size || 14) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  // --- 고정 timestep 루프 ---
  var acc = 0;
  var last = performance.now();
  function frame(now) {
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    var steps = 0;
    while (acc >= BB.CONFIG.STEP && steps < BB.CONFIG.MAX_STEPS) {
      update(BB.CONFIG.STEP);
      acc -= BB.CONFIG.STEP;
      steps++;
    }
    render();
    BB.input.update();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})(window.BB);
