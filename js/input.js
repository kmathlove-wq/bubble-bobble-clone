// ===== input.js =====
// 키보드 입력 관리. 매 프레임 끝에 BB.input.update() 를 부르면
// "이번 프레임에 처음 눌림(pressed)" 상태가 초기화된다.
(function (BB) {
  var KEYMAP = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'jump',
    Space: 'bubble',
    KeyZ: 'bubble',
    KeyX: 'bubble',
    KeyM: 'mute',
    KeyP: 'pause',
    Enter: 'start'
  };

  var held = {};      // 지금 눌려있는가
  var pressed = {};   // 이번 프레임에 처음 눌렸는가

  window.addEventListener('keydown', function (e) {
    var action = KEYMAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (!held[action]) pressed[action] = true;
    held[action] = true;
  });

  window.addEventListener('keyup', function (e) {
    var action = KEYMAP[e.code];
    if (!action) return;
    e.preventDefault();
    held[action] = false;
  });

  // 창을 벗어나면 눌린 키 해제 (키가 눌린 채로 멈추는 버그 방지)
  window.addEventListener('blur', function () {
    for (var k in held) held[k] = false;
  });

  BB.input = {
    held: function (a) { return !!held[a]; },
    pressed: function (a) { return !!pressed[a]; },
    update: function () { for (var k in pressed) delete pressed[k]; }
  };
})(window.BB);
