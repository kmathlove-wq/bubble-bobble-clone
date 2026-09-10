// ===== bubble.js =====
// 거품 규칙(민결이 설계):
//   1) 방울1  : 주인공이 본 방향으로 화면 가로의 1/3보다 좀 더 날아감
//   2) 방울2  : 그 뒤 위로 떠오름 (옆으로 살랑)
//   3) 방울3  : 천장에 거의 닿으면 방울3으로 바뀌며 터짐
// 적은 "방울1 상태"에 닿았을 때만 잡힌다. (잡는 처리는 아래 checkHitEnemies)
(function (BB) {
  var C = BB.CONFIG;

  var SHOOT_SPEED = 240;              // 방울1 날아가는 속도
  var SHOOT_DIST = C.VW * 0.38;       // 화면 가로의 1/3보다 좀 더
  var RISE_SPEED = 34;                // 방울2 떠오르는 속도
  var CEILING_MARGIN = 6;             // 천장에서 이만큼 가까우면 방울3 → 터짐
  var LIFETIME = 10.0;               // 안전장치: 이 시간 지나면 터짐
  var POP_TIME = 0.16;

  BB.Bubble = function (x, y, dir, kind) {
    this.w = 16;
    this.h = 16;
    this.x = x - this.w / 2;
    this.y = y - this.h / 2;
    this.dir = dir < 0 ? -1 : 1;
    this.kind = kind || 'normal';
    this.state = 'shoot';           // 'shoot'(방울1) | 'rise'(방울2) | 'pop'(방울3)
    this.age = 0;
    this.stateT = 0;
    this.traveled = 0;
    this.drift = (Math.random() < 0.5 ? -1 : 1) * 10;
    this.dead = false;
  };

  BB.Bubble.prototype.box = function () {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  };

  // 주인공이 이 거품 위에 설 수 있는가? (떠오르는 빈 거품만)
  BB.Bubble.prototype.canStandOn = function () {
    return this.kind === 'normal' && this.state === 'rise';
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
      var step = this.dir * SHOOT_SPEED * dt;
      this.x += step;
      this.traveled += Math.abs(step);
      if (this.x <= 0 || this.x + this.w >= C.VW) {
        this.x = BB.util.clamp(this.x, 0, C.VW - this.w);
        this.state = 'rise'; this.stateT = 0;
      }
      if (this.traveled >= SHOOT_DIST) { this.state = 'rise'; this.stateT = 0; }

    } else if (this.state === 'rise') {
      this.y -= RISE_SPEED * dt;
      this.x += this.drift * dt;
      if (this.x <= 0 || this.x + this.w >= C.VW) {
        this.x = BB.util.clamp(this.x, 0, C.VW - this.w);
        this.drift = -this.drift;
      }
      // 발판 아랫면(천장 역할)에 거의 닿으면 방울3 → 터짐
      var head = { x: this.x + 2, y: this.y - CEILING_MARGIN, w: this.w - 4, h: CEILING_MARGIN + 2 };
      if (this.y <= CEILING_MARGIN || (level && level.overlapsSolid(head))) {
        this.pop();
      }
      if (this.age >= LIFETIME) this.pop();

    } else if (this.state === 'pop') {
      if (this.stateT >= POP_TIME) this.dead = true;
    }
  };

  BB.Bubble.prototype.draw = function (ctx) {
    var name = this.state === 'shoot' ? '방울1'
             : this.state === 'rise'  ? '방울2'
             : '방울3';
    var img = BB.assets.images[name];
    if (img) {
      ctx.drawImage(img, this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    } else {
      ctx.strokeStyle = '#8ef';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
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
