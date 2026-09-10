# Project Memory

## 환경
- 순수 HTML + 자바스크립트(캔버스 2D). 게임 엔진·번들러 없음. `index.html` 더블클릭으로 실행
  (그래서 ES module import 대신 클래식 `<script>` 태그 순서 로딩 — file:// 에서 CORS 걸림).
- 로컬 python: `C:\Users\kmath\AppData\Local\Programs\Python\Python312\python.exe` (python3 별칭은 가짜).
- 원본 자료(읽기 전용, 건드리지 말 것): `D:\민결이자료\코딩\엔트리\81강버블보블(인데 쓸모가 없...)`
  - 이미지/: 주인공1~5.png, 적1~4.png, 적소멸1~3.png, 방울1~3.png, 배경.png(검정 1181x886), 지형.png(1181x886, 1스테이지 발판 배치)
  - 효과음/: 배경음악.mp3 (3.5MB). 효과음 파일은 없음.
  - 캐릭터 스프라이트는 전부 94x94.
- 사용자 엔트리 원작: 캔버스 640x360, HUD=생명(좌상)/점수·시간(우상) 파란 동그라미, 스페이스로 거품,
  적 접촉 즉사, "게임 클리어에 실패했습니다 다시하려면 클릭하세요" 실패화면. → 새 게임은 이걸 원작풍으로 개선.

## 저작권 경계
- 타이토 원작의 스프라이트·음원·정확한 100개 레벨 레이아웃 그대로 재현 금지.
- 사용자 본인 제작 그림 + 배경음악.mp3 = 사용 OK. 효과음 = 코드로 생성(WebAudio) 또는 CC0만.
- khinsider "Bubble Bobble Arcade" 링크 = 원작 립. 사용 불가로 사용자와 합의됨.

## 상태 (2026-09-10 세션)
- 설계.md·실행계획.md 승인됨.
- 폴더 위치: 처음 R02/D03 → 사용자 요청으로 R01/D01/P17 이동.
- **M0~M5 완료 + GitHub Pages 배포 완료.**
  - 저장소: https://github.com/kmathlove-wq/bubble-bobble-clone (public, gh 계정 kmathlove-wq)
  - 배포 URL: https://kmathlove-wq.github.io/bubble-bobble-clone/
  - Pages = legacy build, main 브랜치 루트. push 하면 자동 재빌드(~1분).
- 게임 이름 = "내가 만든 버블보블".
- 조작 확정: 스페이스/W/↑=점프, **마우스 왼쪽클릭**(+Z/X)=거품/공격, A/D/←→=이동, M=음소거, P=일시정지.
- 거품 규칙(사용자 지정): 방울1로 가로 38% 날아감 → 방울2로 떠오름 → 천장 근처 방울3 되며 터짐.
  적은 방울1(shoot)에만 잡힘 → 적소멸1로 떠올라 천장서 흔들림 → 주인공 닿으면 적소멸2/3 죽고 과일.
- 적: 항상 추격(walker/hopper/flyer). rush(시간 지날수록 최대 1.6배), angry(마지막1/시간28%↓).
  심술고래(BB.Whale) = 시간 0에 등장, 무적 추격.
- 적 그림: 오른쪽=적1↔적2, 왼쪽=적3↔적4 (방향별, 뒤집기 없음).
- 엔트리 원작 코드 분석함: 연속 스폰 + 적속도 증가 + 추격 + 시간제한 생존형. 변수 17개(생명/점수/시간/적속도 등).
- **M0~M10 완료. 재배포 완료.** 게임 전체 흐름 동작(플레이→클리어→다음판→미스→부활→게임오버/엔딩).
- M6: text() 검은테두리, ROUND CLEAR 점수합산연출, GAME OVER/ENDING 화면, EXTEND HUD.
- M7: 파워업 7종(shoe/candyYellow·Red·Blue/umbrella/potion/ring) + ExtendLetter 6개→목숨+1. maybeDrop() 로 드랍.
  player.stats(speed/bubbleRange/bubbleCooldown/bubbleRise) 죽으면 리셋 안 함(현재) — 판 넘어가도 유지.
- M8: js/levels.js = SKELETONS 4종 + 자동생성 29판 + 보스판(def.boss). BB.Boss(hp10, 졸개소환, 체력바, 방울1 직격으로 hp--).
  레벨 행은 전부 32칸 — 파이썬 정규화 스크립트로 맞춤(33칸 나오면 안 됨).
- M9: js/sfx.js = WebAudio 신스 14종 + 배경음악.mp3 루프(첫 입력에 wake). BB.Effect(water/lightning/fire) 특수거품 즉사.
- 심술고래 그림: assets/이미지/고래.png (94x94, PIL 로 생성). 코드도형 fallback 남김.
- 모바일: index.html #touch 버튼(BB._setAct), css 반응형, main.js resize 작은화면 fractional scale. favicon.png(PIL 생성).
- 에셋 18개(고래 추가). 로드순서에 sfx.js 추가(input 다음).
- 다음 후보: 밸런스 튜닝, 7판 사용자 커스텀, 커스텀 도메인(CNAME), 스프라이트(과일·아이템) 픽셀아트.
- 물리: GRAVITY 900, JUMP_V 330, 점프 유예 0.11s. 발판 3칸(48px) 간격이면 점프로 닿음.
- 발판 충돌 규칙: 위에서 착지 O, 옆에서 막힘 O, 아래→위 통과 O (level.js landingY + player.js X충돌).
- 주인공 그림: 오른쪽=주인공1, 왼쪽=주인공3(뒤집기 안 함), 점프=주인공5, 거품뿜기=주인공2. 걷기 애니 없음.
- 테스트: `_devserver.py`(포트 8818, no-cache) 로 띄우고 playwright로 확인. `python -m http.server`는
  브라우저가 js 파일을 캐시해서 수정이 반영 안 됨 → no-cache 서버 필수. `test.html` = 순수로직 11개.
- playwright `browser_navigate` 로 같은 URL 재방문 시 상태가 안 씻김 → `?v=N` 쿼리로 강제 새 로드.

## 설계 조각 순서 (실행계획의 뼈대)
1. 뼈대: index.html + 캔버스 + 게임 루프 + 상태머신(시작/플레이/클리어/게임오버) + 에셋 로더
2. 지형 + 주인공 이동/점프/중력 + 한쪽 통행 발판 + 화면 위아래 래핑
3. 거품: 뿜기→직진→정지→상승→자연소멸, 거품 타기
4. 적: 통통이 기본 AI + 거품에 가두기 + 부딪혀 터뜨리기 + 과일 드랍 + 판 클리어
5. 적 종류 3개 추가(뿔몬/날개몬/유령몬) + 화난 적 + 심술고래(무적 추격자)
6. HUD(1UP/HIGH/ROUND, 목숨 아이콘, 시간 막대) + 성공/실패/게임오버 화면 + 콤보 점수
7. 아이템(신발·사탕·우산·물약) + EXTEND 글자 + 점수 목숨 추가
8. 레벨 데이터: 글자맵 파서 + 1판(지형.png) + 2~29판 + 30판 보스
9. 특수 거품(물·번개·불) + 효과음(WebAudio 신스) + 배경음악 + 음소거 버튼
10. 다듬기 + GitHub 저장소 + Pages 배포 + (나중에) 커스텀 도메인 CNAME

## 다음
- 사용자가 설계.md 검토 → 승인되면 writing-plans 스킬로 실행계획.md 작성.
