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
})(window.BB);
