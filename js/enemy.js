// ===== enemy.js =====
// 적 몬스터. M4에서는 '통통이'(walker)만. M5에서 종류·화난 적·심술고래 추가.
(function (BB) {
  var C = BB.CONFIG;

  var TYPE = {
    walker: { speed: 42,  hue: 0,    hop: 1.8 }   // 파랑 (원본 색)
  };

  BB.Enemy = function (type, x, y) {
    this.type = TYPE[type] ? type : 'walker';
    this.w = 13;
    this.h = 13;
    this.x = x + (C.TILE - this.w) / 2;
    this.y = y + (C.TILE - this.h);
    this.vx = (Math.random() < 0.5 ? -1 : 1) * TYPE[this.type].speed;
    this.vy = 0;
    this.onGround = false;
    this.state = 'walk';       // 'walk' | 'trapped' | 'dying'
    this.angry = false;
    this.animT = 0;
    this.hopCd = BB.util.rand(1, 3);
    this.dyingT = 0;
    this.captor = null;        // 나를 가둔 거품
    this.dead = false;
    this._tinted = null;
  };

  BB.Enemy.prototype.box = function () {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  };

  BB.Enemy.prototype.speed = function () {
    var s = TYPE[this.type].speed;
    return this.angry ? s * 1.5 : s;
  };

  BB.Enemy.prototype.update = function (dt, level, player) {
    this.animT += dt;

    if (this.state === 'dying') {
      this.dyingT += dt;
      if (this.dyingT >= 0.42) this.dead = true;
      return;
    }

    if (this.state === 'trapped') {
      // 위치는 captor 거품이 정해준다. 거품이 사라졌는데 아직 갇힘이면 탈출.
      if (!this.captor || this.captor.dead || this.captor.state === 'pop') {
        this._escape();
      }
      return;
    }

    // --- walk ---
    var spd = this.speed();
    if (this.vx > 0) this.vx = spd; else this.vx = -spd;

    // 중력
    this.vy += C.GRAVITY * dt;
    if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;

    var prevBottom = this.y + this.h;
    var prevLeft = this.x, prevRight = this.x + this.w;

    // 가로 이동 + 벽/발판 옆면에서 방향 전환
    this.x += this.vx * dt;
    if (this.x <= 0) { this.x = 0; this.vx = Math.abs(this.vx); }
    if (this.x + this.w >= C.VW) { this.x = C.VW - this.w; this.vx = -Math.abs(this.vx); }
    if (level) {
      var hb = this.box();
      for (var i = 0; i < level.solids.length; i++) {
        var s = level.solids[i];
        if (!BB.util.aabb(hb, s)) continue;
        if (this.vx > 0 && prevRight <= s.x + 0.5) { this.x = s.x - this.w; this.vx = -this.vx; }
        else if (this.vx < 0 && prevLeft >= s.x + s.w - 0.5) { this.x = s.x + s.w; this.vx = -this.vx; }
        hb = this.box();
      }
    }

    // 세로 이동 + 착지
    this.y += this.vy * dt;
    this.onGround = false;
    if (this.vy >= 0 && level) {
      var landY = level.landingY(this.box(), prevBottom);
      if (landY !== null) { this.y = landY - this.h; this.vy = 0; this.onGround = true; }
    }
    BB.util.wrapY(this, C.VH);

    // 발판 끝에서 떨어지지 않게 방향 전환 (통통이는 발판 위를 지킴)
    if (this.onGround && level) {
      var aheadX = this.vx > 0 ? this.x + this.w + 2 : this.x - 2;
      var probe = { x: aheadX, y: this.y + this.h + 1, w: 1, h: 4 };
      if (!level.overlapsSolid(probe)) this.vx = -this.vx;
    }

    // 가끔 폴짝
    this.hopCd -= dt;
    if (this.hopCd <= 0 && this.onGround) {
      this.vy = -C.JUMP_V * (this.angry ? 0.62 : 0.42) * TYPE[this.type].hop / 1.8;
      this.hopCd = BB.util.rand(this.angry ? 0.7 : 1.4, this.angry ? 1.8 : 3.5);
    }

    // 주인공 쪽으로 살짝 끌림 (같은 높이대면)
    if (player && Math.abs((player.y + player.h) - (this.y + this.h)) < 24) {
      if (player.x < this.x && this.vx > 0 && Math.random() < 0.02) this.vx = -this.vx;
      if (player.x > this.x && this.vx < 0 && Math.random() < 0.02) this.vx = -this.vx;
    }
  };

  BB.Enemy.prototype.trapInto = function (bubble) {
    this.state = 'trapped';
    this.captor = bubble;
    this.vx = 0; this.vy = 0;
  };

  BB.Enemy.prototype._escape = function () {
    this.state = 'walk';
    this.captor = null;
    this.angry = true;
    this.vx = (Math.random() < 0.5 ? -1 : 1) * this.speed();
    this.vy = -60;
  };

  BB.Enemy.prototype.killByPop = function () {
    this.state = 'dying';
    this.dyingT = 0;
    this.captor = null;
  };

  // 색조 바꾼 스프라이트 캐시 (walker는 hue 0이라 원본 그대로)
  BB.Enemy.prototype._sprite = function (name) {
    var img = BB.assets.images[name];
    var hue = TYPE[this.type].hue;
    if (!img || hue === 0) return img;
    return img; // M5에서 hue 회전 구현
  };

  BB.Enemy.prototype.draw = function (ctx) {
    var img;
    if (this.state === 'dying') {
      var fi = 1 + Math.min(2, Math.floor(this.dyingT / 0.14)); // 적소멸1~3
      img = BB.assets.images['적소멸' + fi];
    } else {
      var wf = 1 + (Math.floor(this.animT * 8) % 4);            // 적1~4
      img = this._sprite('적' + wf);
    }
    if (!img) return;

    var dw = 24, dh = 24;
    var dx = this.x + this.w / 2 - dw / 2;
    var dy = this.y + this.h - dh + 2;

    ctx.save();
    if (this.angry && this.state === 'walk') {
      // 화난 적: 붉은 색조 (M5에서 종류별 색조와 합침)
      ctx.filter = 'brightness(1.1) saturate(1.6) hue-rotate(-40deg)';
    }
    var flip = this.state !== 'dying' && this.vx > 0;
    if (flip) {
      ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.restore();
  };
})(window.BB);
