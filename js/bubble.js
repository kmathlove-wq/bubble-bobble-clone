// ===== bubble.js =====
// 거품: 뿜기(shoot) → 정지(float) → 상승(rise) → 터짐(pop).
// kind: 'normal' | 'water' | 'lightning' | 'fire' (특수는 M9).
(function (BB) {
  var C = BB.CONFIG;

  var SHOOT_SPEED = 190;   // 뿜을 때 앞으로 나가는 속도
  var SHOOT_TIME = 0.32;   // 이 시간 뒤 정지
  var FLOAT_TIME = 0.35;   // 잠깐 멈춰 있는 시간
  var RISE_SPEED = 26;     // 위로 떠오르는 속도
  var LIFETIME = 8.0;      // 이 시간 지나면 저절로 터짐
  var POP_TIME = 0.14;     // 터지는 그림 보여주는 시간

  BB.Bubble = function (x, y, dir, kind) {
    this.w = 16;
    this.h = 16;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.dir = dir < 0 ? -1 : 1;
    this.kind = kind || 'normal';
    this.state = 'shoot';
    this.age = 0;
    this.stateT = 0;
    this.vx = SHOOT_SPEED * this.dir;
    this.vy = 0;
    this.trapped = null;   // 가둔 적 (M4)
    this.drift = (Math.random() < 0.5 ? -1 : 1) * 8; // 상승 중 옆으로 살랑
    this.dead = false;
  };

  BB.Bubble.prototype.box = function () {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  };

  // 주인공이 이 거품 위에 설 수 있는가? (빈 거품이고, 날아가는 중이 아님)
  BB.Bubble.prototype.canStandOn = function () {
    return this.kind === 'normal' && !this.trapped &&
           (this.state === 'float' || this.state === 'rise');
  };

  BB.Bubble.prototype.pop = function () {
    if (this.state === 'pop') return;
    this.state = 'pop';
    this.stateT = 0;
    if (BB.sfx) BB.sfx.play('pop');
  };

  BB.Bubble.prototype.update = function (dt, level) {
    this.age += dt;
    this.stateT += dt;

    if (this.state === 'shoot') {
      this.x += this.vx * dt;
      // 화면 좌우 벽에 닿으면 정지 상태로
      if (this.x <= 0 || this.x + this.w >= C.VW) {
        this.x = BB.util.clamp(this.x, 0, C.VW - this.w);
        this._toFloat();
      }
      if (this.stateT >= SHOOT_TIME) this._toFloat();

    } else if (this.state === 'float') {
      if (this.stateT >= FLOAT_TIME) { this.state = 'rise'; this.stateT = 0; }

    } else if (this.state === 'rise') {
      this.y -= RISE_SPEED * dt;
      this.x += this.drift * dt;
      // 옆벽에서 튕김
      if (this.x <= 0 || this.x + this.w >= C.VW) {
        this.x = BB.util.clamp(this.x, 0, C.VW - this.w);
        this.drift = -this.drift;
      }
      // 발판 아랫면에 막히면 그 밑에서 옆으로 모임
      if (level) {
        var head = { x: this.x + 3, y: this.y, w: this.w - 6, h: 4 };
        var s = level.overlapsSolid(head);
        if (s) {
          this.y = s.y + s.h;
          this.x += this.drift * dt * 2;
          if (this.x <= 0 || this.x + this.w >= C.VW) this.drift = -this.drift;
        }
      }
      // 화면 맨 위까지 가면 거기서 대기
      if (this.y < 0) this.y = 0;
      if (this.age >= LIFETIME) this.pop();

    } else if (this.state === 'pop') {
      if (this.stateT >= POP_TIME) this.dead = true;
    }
  };

  BB.Bubble.prototype._toFloat = function () {
    if (this.state === 'float' || this.state === 'rise') return;
    this.state = 'float';
    this.stateT = 0;
    this.vx = 0;
  };

  BB.Bubble.prototype.draw = function (ctx) {
    var img;
    if (this.state === 'pop') {
      img = BB.assets.images['방울3']; // "POW"
    } else if (this.trapped) {
      img = BB.assets.images['방울2']; // 적 갇힌 거품
    } else {
      img = BB.assets.images['방울1'];
    }
    if (img) {
      ctx.drawImage(img, this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    } else {
      ctx.strokeStyle = '#8ef';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 특수 거품 색 힌트 (M9 에서 효과 추가)
    if (this.kind !== 'normal' && this.state !== 'pop') {
      ctx.fillStyle = this.kind === 'water' ? 'rgba(60,150,255,0.35)'
                    : this.kind === 'lightning' ? 'rgba(255,230,80,0.35)'
                    : 'rgba(255,90,40,0.35)';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };
})(window.BB);
