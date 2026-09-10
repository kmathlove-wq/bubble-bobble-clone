// ===== enemy.js =====
// 적 몬스터 (민결이 설계 + 엔트리 원작 난이도):
//  - 항상 주인공을 쫓아온다. 발판 위/아래로도 따라온다(점프·낙하).
//  - 시간이 지날수록 빨라진다. 마지막 1마리거나 시간이 얼마 안 남으면 "화남"(빨강·더 빠름).
//  - 걷는 그림: 오른쪽=적1↔적2,  왼쪽=적3↔적4
//  - 방울1(날아가는 거품)에 닿으면 적소멸1 로 떠올라 천장에 붙어 좌우로 흔들림
//  - 주인공이 닿으면 적소멸2 로 죽고 과일을 떨군다
//  - 심술고래(Whale): 판 시간이 다 되면 나타나 무적으로 주인공만 쫓는다.
(function (BB) {
  var C = BB.CONFIG;

  var TYPE = {
    walker: { speed: 46,  jump: 0.92, fly: false },  // 기본 통통이 (발판 3칸 위까지 점프)
    hopper: { speed: 40,  jump: 1.00, fly: false },  // 콩콩 뛰며 쫓아옴
    flyer:  { speed: 60,  jump: 0,    fly: true  }   // 발판 무시하고 날아옴
  };

  // 발판 위에 서 있을 때, 가까운 낭떠러지 방향(-1/+1)
  function nearestEdgeDir(level, e) {
    var footY = e.y + e.h + 2;
    var cx = e.x + e.w / 2;
    var dL = 999, dR = 999;
    for (var d = 4; d < 280; d += 6) {
      if (dR === 999 && !level.overlapsSolid({ x: cx + d, y: footY, w: 2, h: 5 })) dR = d;
      if (dL === 999 && !level.overlapsSolid({ x: cx - d, y: footY, w: 2, h: 5 })) dL = d;
      if (dL !== 999 && dR !== 999) break;
    }
    return dR <= dL ? 1 : -1;
  }

  BB.Enemy = function (type, x, y) {
    this.type = TYPE[type] ? type : 'walker';
    this.w = 13;
    this.h = 13;
    this.x = x + (C.TILE - this.w) / 2;
    this.y = y + (C.TILE - this.h);
    this.vx = -TYPE[this.type].speed;
    this.vy = 0;
    this.onGround = false;
    this.state = 'walk';       // 'walk' | 'floating' | 'dying'
    this.face = 'L';
    this.angry = false;
    this.animT = 0;
    this.wantDir = -1;
    this.jumpCd = BB.util.rand(0.2, 0.8);
    this.descendT = 0;      // 아래 주인공한테 못 내려간 시간
    this.dropThrough = 0;   // 이 시간 동안 발판을 뚫고 내려감
    this.floatT = 0;
    this.stuck = false;
    this.wobbleBase = 0;
    this.dyingT = 0;
    this.dead = false;
  };

  BB.Enemy.prototype.box = function () {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  };

  // 시간이 지날수록 빨라짐 (main 이 넘겨주는 rush = 0~1)
  BB.Enemy.prototype.speed = function () {
    var s = TYPE[this.type].speed;
    if (this.angry) s *= 1.6;
    s *= 1 + (BB.game.rush || 0) * 0.6;
    return s;
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
        this.y -= 78 * dt;
        var head = { x: this.x + 2, y: this.y - 4, w: this.w - 4, h: 6 };
        if (this.y <= 6 || (level && level.overlapsSolid(head))) {
          this.stuck = true;
          this.wobbleBase = this.x;
          if (this.y < 2) this.y = 2;
        }
      } else {
        this.x = this.wobbleBase + Math.sin(this.floatT * 3) * 10;
        this.x = BB.util.clamp(this.x, 2, C.VW - this.w - 2);
      }
      return;
    }

    // ===== walk: 항상 주인공을 쫓아온다 =====
    var spd = this.speed();
    var pcx = player ? player.x + player.w / 2 : this.x;
    var pcy = player ? player.y + player.h / 2 : this.y;
    var ecx = this.x + this.w / 2;
    var ecy = this.y + this.h / 2;

    if (TYPE[this.type].fly) {
      // 날개몬: 주인공을 향해 직선으로 날아옴 (발판 무시)
      var ang = Math.atan2(pcy - ecy, pcx - ecx);
      this.vx = Math.cos(ang) * spd;
      this.vy = Math.sin(ang) * spd;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.x = BB.util.clamp(this.x, 0, C.VW - this.w);
      BB.util.wrapY(this, C.VH);
      this.face = this.vx > 0 ? 'R' : 'L';
      return;
    }

    // 걷는 적
    var dx = pcx - ecx;
    var playerBelow = player && player.y > this.y + this.h + 18;
    var playerAbove = player && (player.y + player.h) < this.y - 6;

    // 방향: 주인공이 거의 바로 아래면 가까운 발판 끝 쪽으로 걸어나가 떨어진다.
    if (playerBelow && Math.abs(dx) < 22 && level) {
      this.wantDir = nearestEdgeDir(level, this);
    } else if (Math.abs(dx) > 10) {
      this.wantDir = dx > 0 ? 1 : -1;
    }
    this.vx = this.wantDir * spd;
    this.face = this.wantDir > 0 ? 'R' : 'L';

    // 중력
    this.vy += C.GRAVITY * dt;
    if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;
    if (this.dropThrough > 0) this.dropThrough -= dt;

    var prevBottom = this.y + this.h;
    var prevLeft = this.x, prevRight = this.x + this.w;
    var hitWall = false;

    // 가로 이동 + 벽/발판 옆면
    this.x += this.vx * dt;
    if (this.x <= 0) { this.x = 0; hitWall = true; this.wantDir = 1; }
    if (this.x + this.w >= C.VW) { this.x = C.VW - this.w; hitWall = true; this.wantDir = -1; }
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

    // 세로 이동 + 착지 (dropThrough 중이면 발판을 뚫고 내려감)
    this.y += this.vy * dt;
    this.onGround = false;
    if (this.vy >= 0 && level && this.dropThrough <= 0) {
      var landY = level.landingY(this.box(), prevBottom);
      if (landY !== null) { this.y = landY - this.h; this.vy = 0; this.onGround = true; }
    }
    BB.util.wrapY(this, C.VH);

    // ----- 아래 있는 주인공한테 못 내려가면 발판을 뚫고 내려간다 -----
    if (this.onGround && playerBelow) {
      this.descendT += dt;
      if (this.descendT > 0.6) { this.dropThrough = 0.5; this.descendT = 0; this.vy = 70; this.onGround = false; }
    } else {
      this.descendT = 0;
    }

    // ----- 주인공이 위에 있으면 점프해서 쫓아간다 -----
    this.jumpCd -= dt;
    if (this.onGround && this.jumpCd <= 0) {
      if (playerAbove && (hitWall || Math.abs(dx) < 44)) {
        this.vy = -C.JUMP_V * (TYPE[this.type].jump + (this.angry ? 0.05 : 0));
        this.jumpCd = BB.util.rand(0.3, 0.7);
      } else if (hitWall) {
        this.vy = -C.JUMP_V * TYPE[this.type].jump;
        this.jumpCd = BB.util.rand(0.25, 0.55);
      } else if (this.type === 'hopper') {
        this.vy = -C.JUMP_V * TYPE[this.type].jump * 0.7;
        this.jumpCd = BB.util.rand(0.12, 0.4);
      } else {
        this.jumpCd = BB.util.rand(0.15, 0.5);
      }
    }
  };

  BB.Enemy.prototype.captureFloat = function () {
    if (this.state !== 'walk') return;
    this.state = 'floating';
    this.floatT = 0;
    this.stuck = false;
    this.vx = 0; this.vy = 0;
    this.angry = false;
    if (BB.sfx) BB.sfx.play('trap');
  };

  BB.Enemy.prototype.popKill = function () {
    if (this.state !== 'floating') return;
    this.state = 'dying';
    this.dyingT = 0;
  };

  BB.Enemy.prototype.draw = function (ctx) {
    var img, dw = 24, dh = 24;

    if (this.state === 'dying') {
      img = BB.assets.images[this.dyingT > 0.18 ? '적소멸3' : '적소멸2'];
    } else if (this.state === 'floating') {
      img = BB.assets.images['적소멸1'];
    } else {
      var f = Math.floor(this.animT * 8) % 2;
      if (this.face === 'R') img = BB.assets.images[f === 0 ? '적1' : '적2'];
      else                   img = BB.assets.images[f === 0 ? '적3' : '적4'];
    }
    if (!img) return;

    var dx = this.x + this.w / 2 - dw / 2;
    var dy = this.y + this.h - dh + 2;

    ctx.save();
    if (this.type === 'flyer' && this.state === 'walk') {
      ctx.filter = 'hue-rotate(280deg) saturate(1.6)';           // 날개몬: 분홍빛
    } else if (this.type === 'hopper' && this.state === 'walk') {
      ctx.filter = 'hue-rotate(90deg) saturate(1.3)';            // 콩콩이: 초록빛
    }
    if (this.angry && this.state === 'walk') {
      ctx.filter = 'brightness(1.15) saturate(2) hue-rotate(-50deg)'; // 화남: 빨강
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  };

  // ===================== 심술고래 =====================
  BB.Whale = function () {
    this.w = 40; this.h = 26;
    // 화면 밖 위에서 등장
    this.x = BB.util.rand(60, C.VW - 100);
    this.y = -40;
    this.speed = 90;
    this.appearT = 0;
  };
  BB.Whale.prototype.box = function () {
    return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 };
  };
  BB.Whale.prototype.update = function (dt, player) {
    this.appearT += dt;
    if (!player) return;
    var tx = player.x + player.w / 2 - this.w / 2;
    var ty = player.y + player.h / 2 - this.h / 2;
    var ang = Math.atan2(ty - this.y, tx - this.x);
    var sp = Math.min(this.speed, this.speed * this.appearT); // 서서히 가속
    this.x += Math.cos(ang) * sp * dt;
    this.y += Math.sin(ang) * sp * dt;
  };
  BB.Whale.prototype.draw = function (ctx) {
    var x = this.x, y = this.y, w = this.w, h = this.h;
    ctx.save();
    ctx.fillStyle = '#eef3ff';
    ctx.strokeStyle = '#9fb4d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // 꼬리
    ctx.beginPath();
    ctx.moveTo(x + w - 4, y + h / 2);
    ctx.lineTo(x + w + 8, y + 2);
    ctx.lineTo(x + w + 8, y + h - 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 눈
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(x + 12, y + h / 2 - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
})(window.BB);
