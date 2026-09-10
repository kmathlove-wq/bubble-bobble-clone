// ===== player.js =====
// 주인공(버블룬): 좌우 이동, 가변 점프, 중력, 한쪽 통행 발판, 화면 위아래 래핑.
(function (BB) {
  var C = BB.CONFIG;

  BB.Player = function (x, y) {
    this.w = 11;
    this.h = 13;
    this.x = x + (C.TILE - this.w) / 2;
    this.y = y + (C.TILE - this.h);
    this.vx = 0;
    this.vy = 0;
    this.facing = 'R';        // 'L' / 'R'
    this.onGround = false;
    this.coyote = 0;          // 발판에서 떨어진 뒤 점프 허용 시간
    this.jumpHeld = false;    // 가변 점프용
    this.animT = 0;
    this.blowT = 0;           // 거품 뿜는 순간 포즈 표시 시간 (M3)

    // M7에서 아이템으로 바뀜
    this.stats = { speed: 1, bubbleRange: 1, bubbleCooldown: 1, bubbleRise: 1 };
  };

  BB.Player.prototype.box = function () {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  };

  BB.Player.prototype.update = function (dt, level) {
    var left = BB.input.held('left');
    var right = BB.input.held('right');

    // --- 좌우 ---
    var dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0) {
      this.vx += dir * C.MOVE_ACCEL * dt;
      this.facing = dir > 0 ? 'R' : 'L';
    } else {
      // 마찰
      var f = C.MOVE_FRICTION * dt;
      if (Math.abs(this.vx) <= f) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * f;
    }
    var maxS = C.MOVE_SPEED * this.stats.speed;
    this.vx = BB.util.clamp(this.vx, -maxS, maxS);

    // --- 점프 ---
    if (this.onGround) this.coyote = 0.1;
    else this.coyote -= dt;

    if (BB.input.pressed('jump') && this.coyote > 0) {
      this.vy = -C.JUMP_V;
      this.onGround = false;
      this.coyote = 0;
      this.jumpHeld = true;
    }
    // 가변 점프: 점프키를 일찍 떼면 덜 올라감
    if (this.jumpHeld && !BB.input.held('jump')) {
      if (this.vy < 0) this.vy *= C.JUMP_CUT;
      this.jumpHeld = false;
    }

    // --- 중력 ---
    this.vy += C.GRAVITY * dt;
    if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;

    var prevBottom = this.y + this.h;

    // --- 가로 이동 (발판은 가로로 안 막음, 화면 좌우 끝만 벽) ---
    this.x += this.vx * dt;
    this.x = BB.util.clamp(this.x, 0, C.VW - this.w);

    // --- 세로 이동 ---
    this.y += this.vy * dt;
    this.onGround = false;

    if (this.vy >= 0 && level) {
      var landY = level.landingY(this.box(), prevBottom);
      // 거품 위에 서기 (M3에서 BB.bubbles 생기면)
      if (landY === null && BB.bubbles) {
        for (var i = 0; i < BB.bubbles.length; i++) {
          var bb = BB.bubbles[i];
          if (bb.canStandOn && bb.canStandOn()) {
            var top = bb.y;
            var bx = bb.x, bw = bb.w;
            if (this.x + this.w > bx && this.x < bx + bw &&
                prevBottom <= top + 2 && this.y + this.h >= top) {
              landY = top;
              this.vy = -C.JUMP_V * 0.45; // 통 하고 튕김
              break;
            }
          }
        }
      }
      if (landY !== null) {
        this.y = landY - this.h;
        if (this.vy > 0) this.vy = 0;
        this.onGround = true;
      }
    }

    // --- 화면 위아래 래핑 ---
    BB.util.wrapY(this, C.VH);

    // --- 애니메이션 타이머 ---
    if (Math.abs(this.vx) > 5 && this.onGround) this.animT += dt;
    else this.animT = 0;
    if (this.blowT > 0) this.blowT -= dt;
  };

  BB.Player.prototype.draw = function (ctx) {
    var img;
    if (this.blowT > 0) {
      img = BB.assets.images['주인공5'];
    } else if (Math.abs(this.vx) > 5 && this.onGround) {
      var frame = 1 + (Math.floor(this.animT * 10) % 4); // 주인공1~4
      img = BB.assets.images['주인공' + frame];
    } else {
      img = BB.assets.images['주인공1'];
    }
    if (!img) return;

    var dw = 26, dh = 26;
    var dx = this.x + this.w / 2 - dw / 2;
    var dy = this.y + this.h - dh + 2;

    ctx.save();
    if (this.facing === 'L') {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.restore();
  };
})(window.BB);
