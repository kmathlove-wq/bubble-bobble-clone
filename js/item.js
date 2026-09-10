// ===== item.js =====
// 과일 · 파워업 · EXTEND 글자. (M4~M7에서 클래스 추가, 지금은 점수표만)
(function (BB) {
  // 한 연쇄로 터진 적 수 → 과일 등급 점수
  var FRUIT_TABLE = [
    { tier: 1, name: '사탕',       score: 100 },
    { tier: 2, name: '바나나',     score: 300 },
    { tier: 3, name: '복숭아',     score: 500 },
    { tier: 4, name: '햄버거',     score: 700 },
    { tier: 5, name: '아이스크림', score: 1000 },
    { tier: 6, name: '다이아몬드', score: 3000 }
  ];
  BB.FRUIT_TABLE = FRUIT_TABLE;

  // 터진 적 수(1부터) → 점수
  BB.fruitTierScore = function (count) {
    var idx = BB.util.clamp(count, 1, FRUIT_TABLE.length) - 1;
    return FRUIT_TABLE[idx].score;
  };
  // 터진 적 수 → 등급(1~6)
  BB.fruitTier = function (count) {
    return BB.util.clamp(count, 1, FRUIT_TABLE.length);
  };

  var C = BB.CONFIG;
  var FRUIT_COLORS = ['#ff5a5a', '#ffe14d', '#ffb347', '#c98a5b', '#fff1c9', '#7dfdfd'];

  // ===== BB.Fruit =====
  // tier 1~6. 몇 초 뒤 사라짐. 주우면 점수.
  BB.Fruit = function (x, y, tier) {
    this.w = 12; this.h = 12;
    this.x = x; this.y = y;
    this.tier = BB.util.clamp(tier, 1, 6);
    this.score = FRUIT_TABLE[this.tier - 1].score;
    this.name = FRUIT_TABLE[this.tier - 1].name;
    this.vy = -40; this.vx = BB.util.rand(-20, 20);
    this.life = 6.0;
    this.onGround = false;
    this.dead = false;
  };
  BB.Fruit.prototype.box = function () {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  };
  BB.Fruit.prototype.update = function (dt, level) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (!this.onGround) {
      this.vy += C.GRAVITY * dt;
      if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;
      var prevBottom = this.y + this.h;
      this.x += this.vx * dt;
      this.x = BB.util.clamp(this.x, 2, C.VW - this.w - 2);
      this.y += this.vy * dt;
      if (this.vy >= 0 && level) {
        var landY = level.landingY(this.box(), prevBottom);
        if (landY !== null) { this.y = landY - this.h; this.vy = 0; this.vx = 0; this.onGround = true; }
      }
      BB.util.wrapY(this, C.VH);
    }
  };
  BB.Fruit.prototype.draw = function (ctx) {
    // 사라지기 직전엔 깜빡
    if (this.life < 1.5 && (Math.floor(this.life * 8) % 2) === 0) return;
    var cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.fillStyle = FRUIT_COLORS[this.tier - 1];
    ctx.beginPath();
    ctx.arc(cx, cy, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a7d2c';
    ctx.fillRect(cx - 1, this.y - 2, 2, 4); // 꼭지
    if (this.tier >= 6) { // 다이아몬드 반짝
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);
    }
  };
})(window.BB);
