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
    roundFruitScore: 0,   // 이번 판에서 과일로 번 점수 (ROUND CLEAR 연출용)
    combo: 0,             // 잇따라 터뜨린 적 수
    comboTimer: 0,
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

  // --- 라운드 로드 ---
  function loadRound(n) {
    if (!BB.LEVELS || !BB.Level || !BB.Player) return;
    var def = BB.LEVELS[(n - 1) % BB.LEVELS.length] || BB.LEVELS[0];
    BB.level = new BB.Level(def);
    BB.player = new BB.Player(BB.level.playerStart.x, BB.level.playerStart.y);
    BB.bubbles = [];
    BB.fruits = [];
    BB.enemies = [];
    BB.whale = null;
    BB.game.roundFruitScore = 0;
    BB.game.combo = 0;
    BB.game.comboTimer = 0;
    BB.game.rush = 0;
    BB.game.roundElapsed = 0;
    for (var i = 0; i < BB.level.enemySpawns.length; i++) {
      var e = BB.level.enemySpawns[i];
      if (BB.Enemy) BB.enemies.push(new BB.Enemy(e.type, e.x, e.y));
    }
  }
  BB.loadRound = loadRound;

  function respawnPlayer() {
    var st = BB.level.playerStart;
    BB.player = new BB.Player(st.x, st.y);
    BB.bubbles = [];
    BB.whale = null;                              // 죽으면 고래는 잠깐 물러남
    if (BB.level.timeLeft <= 0) BB.level.timeLeft = BB.level.time * 0.4;
    BB.game.rush = Math.max(0, BB.game.rush - 0.4);
  }

  function startGame() {
    BB.game.score = 0;
    BB.game.lives = 3;
    BB.game.round = 1;
    loadRound(1);
    BB.game.setState('PLAYING');
  }

  function addScore(n) {
    var before = BB.game.score;
    BB.game.score += n;
    // 3만점마다 목숨 +1
    if (Math.floor(BB.game.score / 30000) > Math.floor(before / 30000)) {
      BB.game.lives++;
      if (BB.sfx) BB.sfx.play('extend');
    }
    if (BB.game.score > BB.game.hiScore) {
      BB.game.hiScore = BB.game.score;
      try { localStorage.setItem('bb_hiscore', String(BB.game.hiScore)); } catch (e) {}
    }
  }
  BB.addScore = addScore;

  function playerDie() {
    if (BB.player.invuln > 0) return;
    BB.game.lives--;
    if (BB.sfx) BB.sfx.play('miss');
    BB.game.setState('MISS');
  }

  // --- 충돌 처리 ---
  function handleCollisions(dt) {
    var p = BB.player;

    // 콤보 타이머 (여러 마리를 잇따라 터뜨리면 등급 상승)
    if (BB.game.comboTimer > 0) {
      BB.game.comboTimer -= dt;
      if (BB.game.comboTimer <= 0) BB.game.combo = 0;
    }

    // 날아가는 거품(방울1) vs 걷는 적  → 적이 떠오름
    for (var i = 0; i < BB.bubbles.length; i++) {
      var b = BB.bubbles[i];
      if (b.state !== 'shoot') continue;
      for (var j = 0; j < BB.enemies.length; j++) {
        var en = BB.enemies[j];
        if (en.state === 'walk' && BB.util.aabb(b.box(), en.box())) {
          en.captureFloat();
          b.pop();
          break;
        }
      }
    }

    // 주인공 vs 적
    for (var k = 0; k < BB.enemies.length; k++) {
      var e = BB.enemies[k];
      if (!BB.util.aabb(p.box(), e.box())) continue;
      if (e.state === 'floating') {
        // 떠오른 적을 터뜨림 → 죽고 과일 떨굼
        BB.game.combo++;
        BB.game.comboTimer = 1.6;
        var tier = BB.fruitTier(BB.game.combo);
        e.popKill();
        BB.fruits.push(new BB.Fruit(e.x, e.y, tier));
        if (BB.sfx) BB.sfx.play(BB.game.combo >= 2 ? 'combo' : 'enemyPop');
      } else if (e.state === 'walk') {
        playerDie();
        return;
      }
    }

    // 주인공 vs 과일
    for (var m = BB.fruits.length - 1; m >= 0; m--) {
      var f = BB.fruits[m];
      if (BB.util.aabb(p.box(), f.box())) {
        addScore(f.score);
        BB.game.roundFruitScore += f.score;
        if (BB.sfx) BB.sfx.play('fruit');
        BB.fruits.splice(m, 1);
      }
    }
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

      BB.game.roundElapsed += dt;
      BB.level.update(dt);
      BB.player.update(dt, BB.level);

      // --- 난이도: 시간이 지날수록 적이 빨라지고, 얼마 안 남으면 화남 ---
      var t = BB.level, frac = t.timeLeft / t.time;   // 1 → 0
      BB.game.rush = BB.util.clamp((1 - frac) * 1.1 + BB.game.roundElapsed / 90, 0, 1.4);
      var hurry = t.timeLeft <= t.time * 0.28;
      var lastOne = BB.enemies.length === 1;
      for (var a = 0; a < BB.enemies.length; a++) {
        var en = BB.enemies[a];
        if (en.state === 'walk') en.angry = hurry || lastOne;
      }

      // --- 심술고래: 시간이 다 되면 등장, 무적으로 주인공만 쫓음 ---
      if (t.timeLeft <= 0 && !BB.whale && BB.Whale) {
        BB.whale = new BB.Whale();
        if (BB.sfx) BB.sfx.play('whale');
      }
      if (BB.whale) BB.whale.update(dt, BB.player);

      var i, j;
      for (i = 0; i < BB.bubbles.length; i++) BB.bubbles[i].update(dt, BB.level);
      for (i = 0; i < BB.enemies.length; i++) BB.enemies[i].update(dt, BB.level, BB.player);
      for (i = 0; i < BB.fruits.length; i++) BB.fruits[i].update(dt, BB.level);

      handleCollisions(dt);

      // 심술고래에 닿으면 죽음
      if (BB.whale && BB.player.invuln <= 0 && BB.util.aabb(BB.player.box(), BB.whale.box())) {
        playerDie();
      }

      for (j = BB.bubbles.length - 1; j >= 0; j--) if (BB.bubbles[j].dead) BB.bubbles.splice(j, 1);
      for (j = BB.enemies.length - 1; j >= 0; j--) if (BB.enemies[j].dead) BB.enemies.splice(j, 1);
      for (j = BB.fruits.length - 1; j >= 0; j--) if (BB.fruits[j].dead) BB.fruits.splice(j, 1);

      // 적을 다 잡았으면 판 클리어
      if (BB.enemies.length === 0 && BB.game.state === 'PLAYING') {
        BB.whale = null;
        if (BB.sfx) BB.sfx.play('roundClear');
        BB.game.setState('ROUND_CLEAR');
      }

    } else if (s === 'MISS') {
      if (BB.game.stateTime > 1.4) {
        if (BB.game.lives <= 0) {
          BB.game.setState('GAME_OVER');
        } else {
          respawnPlayer();
          BB.game.setState('PLAYING');
        }
      }

    } else if (s === 'ROUND_CLEAR') {
      if (BB.game.stateTime > 2.2) {
        BB.game.round++;
        loadRound(BB.game.round);
        BB.game.setState('PLAYING');
      }

    } else if (s === 'GAME_OVER') {
      if (BB.game.stateTime > 1 &&
          (BB.input.pressed('jump') || BB.input.pressed('bubble') || BB.input.pressed('start'))) {
        BB.game.setState('TITLE');
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

    } else if (s === 'PLAYING' || s === 'MISS' || s === 'ROUND_CLEAR') {
      drawWorld();
      var cx2 = BB.CONFIG.VW / 2, cy2 = BB.CONFIG.VH / 2;
      drawHud();

      if (s === 'MISS') {
        text('MISS!', cx2, cy2, 28, '#ff5a5a');
      } else if (s === 'ROUND_CLEAR') {
        text('ROUND CLEAR!', cx2, cy2 - 16, 22, '#ffe14d');
        text('과일 점수  ' + BB.game.roundFruitScore, cx2, cy2 + 16, 13, '#fff');
      }
      if (BB.game.paused) text('일시정지', cx2, cy2, 16);

    } else if (s === 'GAME_OVER') {
      drawWorld();
      var cnt = Math.max(0, 9 - Math.floor(BB.game.stateTime));
      text('GAME OVER', BB.CONFIG.VW / 2, BB.CONFIG.VH / 2 - 20, 28, '#ff5a5a');
      text('점수  ' + BB.game.score, BB.CONFIG.VW / 2, BB.CONFIG.VH / 2 + 12, 14, '#fff');
      text('계속하려면 스페이스   ' + cnt, BB.CONFIG.VW / 2, BB.CONFIG.VH / 2 + 40, 11, '#ccc');
    }
  }

  // 화면 정보(HUD) 그리기
  function drawHud() {
    // 위: 점수 / 최고점수 / 라운드
    text('1UP  ' + BB.game.score, 74, 11, 11, '#fff');
    text('HIGH  ' + BB.game.hiScore, BB.CONFIG.VW / 2, 11, 11, '#ffe14d');
    text('ROUND ' + BB.game.round, BB.CONFIG.VW - 58, 11, 11, '#fff');

    // 아래 왼쪽: 남은 목숨 = 작은 공룡 그림 + 숫자
    var hero = BB.assets.images['주인공1'];
    var n = Math.max(0, BB.game.lives);
    var iconY = BB.CONFIG.VH - 22;
    for (var i = 0; i < Math.min(n, 6); i++) {
      if (hero) ctx.drawImage(hero, 8 + i * 20, iconY, 18, 18);
    }
    if (n > 6 || !hero) {
      text('목숨 x ' + n, 40, BB.CONFIG.VH - 12, 12, '#8ef');
    }
    // 콤보 표시
    if (BB.game.combo >= 2 && BB.game.comboTimer > 0) {
      text(BB.game.combo + ' 연속!', BB.CONFIG.VW - 60, BB.CONFIG.VH - 14, 12, '#ffd23f');
    }

    // 시간 막대 (아래쪽 얇게)
    if (BB.level) {
      var frac = BB.util.clamp(BB.level.timeLeft / BB.level.time, 0, 1);
      var barW = BB.CONFIG.VW - 24;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(12, BB.CONFIG.VH - 4, barW, 3);
      ctx.fillStyle = frac < 0.28 ? '#ff4444' : '#7dd0ff';
      ctx.fillRect(12, BB.CONFIG.VH - 4, barW * frac, 3);
      if (frac < 0.28 && (Math.floor(BB.game.stateTime * 4) % 2) === 0 && BB.level.timeLeft > 0) {
        text('HURRY!', BB.CONFIG.VW / 2, 28, 16, '#ff5a5a');
      }
      if (BB.whale) text('심술고래 등장! 빨리 깨!', BB.CONFIG.VW / 2, 28, 13, '#ffffff');
    }
  }

  // 게임 월드(지형·거품·적·과일·주인공) 그리기
  function drawWorld() {
    if (!BB.level) return;
    BB.level.draw(ctx);
    var i;
    for (i = 0; i < BB.fruits.length; i++) BB.fruits[i].draw(ctx);
    for (i = 0; i < BB.bubbles.length; i++) BB.bubbles[i].draw(ctx);
    for (i = 0; i < BB.enemies.length; i++) BB.enemies[i].draw(ctx);
    if (BB.whale) BB.whale.draw(ctx);
    if (BB.player) BB.player.draw(ctx);
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
