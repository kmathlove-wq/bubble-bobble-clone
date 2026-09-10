// ===== enemy.js =====
// 적 몬스터 (민결이 설계):
//  - 항상 주인공을 쫓아온다.
//  - 걷는 그림: 오른쪽=적1↔적2 반복,  왼쪽=적3↔적4 반복
//  - 방울1(날아가는 거품)에 닿으면 → 적소멸1 로 변해 위로 떠오른다
//  - 천장에 붙어 좌우로 흔들린다
//  - 주인공이 닿으면 → 적소멸2 로 죽고 아이템(과일)을 떨군다
// (M5에서 종류·화난 적·심술고래 추가)
(function (BB) {
  var C = BB.CONFIG;

  var TYPE = {
    walker: { speed: 40, jump: 0.62 }
  };

  BB.Enemy = function (type, x, y) {
    this.type = TYPE[type] ? type : 'walker';
    this.w = 13;
    this.h = 13;
    this.x = x + (C.TILE - this.w) / 2;
    this.y = y + (C.TILE - this.h);
    this.vx = -TYPE[this.type].speed;
    this.vy = 0;
    this.onGround = false;
    this.state = 'walk';      // 'walk' | 'floating' | 'dying'
    this.face = 'L';          // 'L' | 'R'
    this.angry = false;
    this.animT = 0;
    this.jumpCd = BB.util.rand(0.4, 1.2);
    this.floatT = 0;
    this.stuck = false;       // 천장에 붙었나
    this.wobbleBase = 0;
    this.dyingT = 0;
    this.dead = false;
    this.dropTier = 1;        // 죽을 때 떨굴 과일 등급 (main 이 정함)
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
      if (this.dyingT >= 0.34) this.dead = true;
      return;
    }

    if (this.state === 'floating') {
      this.floatT += dt;
      if (!this.stuck) {
        this.y -= 70 * dt;
        // 천장(또는 발판 아랫면)에 닿으면 붙는다
        var head = { x: this.x + 2, y: this.y - 4, w: this.w - 4, h: 6 };
        if (this.y <= 6 || (level && level.overlapsSolid(head))) {
          this.stuck = true;
          this.wobbleBase = this.x;
          if (this.y < 2) this.y = 2;
        }
      } else {
        // 천장에 붙어 좌우로 흔들
        this.x = this.wobbleBase + Math.sin(this.floatT * 3) * 10;
        this.x = BB.util.clamp(this.x, 2, C.VW - this.w - 2);
      }
      return;
    }

    // ===== walk: 항상 주인공을 쫓아온다 =====
    var spd = this.speed();
    var dir = 0;
    if (player) dir = (player.x + player.w / 2) > (this.x + this.w / 2) ? 1 : -1;
    else dir = this.vx > 0 ? 1 : -1;
    this.vx = dir * spd;
    this.face = dir > 0 ? 'R' : 'L';

    // 중력
    this.vy += C.GRAVITY * dt;
    if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;

    var prevBottom = this.y + this.h;
    var prevLeft = this.x, prevRight = this.x + this.w;
    var hitWall = false;

    // 가로 이동 + 벽/발판 옆면
    this.x += this.vx * dt;
    if (this.x <= 0) { this.x = 0; hitWall = true; }
    if (this.x + this.w >= C.VW) { this.x = C.VW - this.w; hitWall = true; }
    if (level) {
      var hb = this.box();
      for (var i = 0; i < level.solids.length; i++) {
        var s = level.solids[i];
        if (!BB.util.aabb(hb, s)) continue;
        if (this.vx > 0 && prevRight <= s.x + 0.5) { this.x = s.x - this.w; hitWall = true; }
        else if (this.vx < 0 && prevLeft >= s.x + s.w - 0.5) { this.x = s.x + s.w; hitWall = true; }
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

    // 벽에 막히거나 / 주인공이 위에 있으면 점프해서 쫓아감
    this.jumpCd -= dt;
    if (this.onGround && this.jumpCd <= 0) {
      var playerAbove = player && (player.y + player.h) < this.y - 6;
      if (hitWall || playerAbove || Math.random() < 0.15) {
        this.vy = -C.JUMP_V * TYPE[this.type].jump;
        this.jumpCd = BB.util.rand(0.5, 1.3);
      } else {
        this.jumpCd = BB.util.rand(0.3, 0.8);
      }
    }
  };

  // 방울1 에 닿았을 때
  BB.Enemy.prototype.captureFloat = function () {
    if (this.state !== 'walk') return;
    this.state = 'floating';
    this.floatT = 0;
    this.stuck = false;
    this.vx = 0; this.vy = 0;
    if (BB.sfx) BB.sfx.play('trap');
  };

  // 주인공이 떠오른 적(적소멸1)에 닿았을 때
  BB.Enemy.prototype.popKill = function () {
    if (this.state !== 'floating') return;
    this.state = 'dying';
    this.dyingT = 0;
  };

  BB.Enemy.prototype.draw = function (ctx) {
    var img;
    var dw = 24, dh = 24;

    if (this.state === 'dying') {
      img = BB.assets.images['적소멸2'];
      if (this.dyingT > 0.18) img = BB.assets.images['적소멸3'] || img;
    } else if (this.state === 'floating') {
      img = BB.assets.images['적소멸1'];
    } else {
      // 걷기: 오른쪽=적1↔적2, 왼쪽=적3↔적4
      var f = Math.floor(this.animT * 7) % 2;
      if (this.face === 'R') img = BB.assets.images[f === 0 ? '적1' : '적2'];
      else                   img = BB.assets.images[f === 0 ? '적3' : '적4'];
    }
    if (!img) return;

    var dx = this.x + this.w / 2 - dw / 2;
    var dy = this.y + this.h - dh + 2;

    if (this.angry && this.state === 'walk') {
      ctx.save();
      ctx.filter = 'brightness(1.15) saturate(1.8) hue-rotate(-45deg)';
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  };
})(window.BB);
