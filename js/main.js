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
    BB.bubbles = [];
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
      if (BB.input.pressed('jump') || BB.input.pressed('bubble') || BB.input.pressed('start')) startGame();

    } else if (s === 'PLAYING') {
      if (BB.input.pressed('pause')) BB.game.paused = !BB.game.paused;
      if (BB.game.paused) return;
      if (BB.level && BB.level.update) BB.level.update(dt);
      if (BB.player && BB.player.update) BB.player.update(dt, BB.level);
      if (BB.bubbles) {
        for (var i = 0; i < BB.bubbles.length; i++) BB.bubbles[i].update(dt, BB.level);
        for (var j = BB.bubbles.length - 1; j >= 0; j--) {
          if (BB.bubbles[j].dead) BB.bubbles.splice(j, 1);
        }
      }
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
      var cx = BB.CONFIG.VW / 2;
      // 주인공 그림
      var hero = BB.assets.images['주인공1'];
      if (hero) ctx.drawImage(hero, cx - 24, 40, 48, 48);
      text('내가 만든 버블보블', cx, 118, 22, '#ffe14d');

      // 조작 안내 상자
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(cx - 150, 150, 300, 92);
      ctx.strokeStyle = '#ff7fd0';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 150, 150, 300, 92);
      text('조작 방법', cx, 166, 12, '#ff9fdc');
      text('이동   ← →   또는   A D', cx, 190, 13, '#ffffff');
      text('점프   스페이스   또는   W', cx, 210, 13, '#ffffff');
      text('거품   마우스 왼쪽 클릭', cx, 230, 13, '#ffffff');

      var blink = (Math.floor(BB.game.stateTime * 2) % 2) === 0;
      if (blink) text('스페이스를 눌러 시작', cx, 272, 16, '#7dff7d');
      text('최고 점수  ' + BB.game.hiScore, cx, 306, 11, '#cccccc');

    } else if (s === 'PLAYING') {
      if (BB.level && BB.level.draw) BB.level.draw(ctx);
      if (BB.bubbles) for (var bi = 0; bi < BB.bubbles.length; bi++) BB.bubbles[bi].draw(ctx);
      if (BB.player && BB.player.draw) BB.player.draw(ctx);
      if (BB.game.paused) text('일시정지', BB.CONFIG.VW / 2, BB.CONFIG.VH / 2, 16);
    }
  }

  function text(str, x, y, size, color) {
    ctx.fillStyle = color || '#fff';
    ctx.font = 'bold ' + (size || 14) + 'px "Segoe UI", "맑은 고딕", monospace';
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
