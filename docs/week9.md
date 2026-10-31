# 9주차 팀 미션 기록

## 역할 분담
- M2~M5 진행 및 기록: [이종원] (Driver)
- M2~M5 리뷰 담당: [이충성] (Reviewer)
- 리뷰 상태: 예정

## M2. 게시글 검색 흐름 찾기
- 검색한 게시글 제목: 테스트1
- 개발자 도구의 Network에서 q에 검색어가 전달되는 것을 확인했다.
- client/src/pages/PostList.tsx: 검색어를 입력받아 검색 요청을 만들고, 결과를 화면에 표시한다.
- client/src/api.ts: 서버에 요청을 보내고 응답을 읽는다.
- server/src/index.ts: /api/posts 요청을 게시글 라우터에 연결한다.
- server/src/routes/posts.ts: q에서 검색어를 읽고, DB에서 제목에 검색어가 포함된 게시글을 찾아 응답한다.
- 검색 흐름: 검색어 입력 → 서버에 검색 요청 → DB 조회 → 결과 응답 → 게시글 목록 표시

## M3. 로그인 코드 찾기
- client/src/pages/Login.tsx: 이메일과 비밀번호를 POST /api/auth/login으로 전송한다.
- server/src/routes/auth.ts의 /login: DB에서 계정을 확인하고, 로그인에 성공하면 세션에 사용자 정보를 저장한다.
- 같은 파일의 /me: 세션에 저장된 현재 로그인 사용자 정보를 응답한다.

## M4. 관리자 코드 찾기
- client/src/App.tsx: 사용자의 role이 ADMIN일 때 관리자 메뉴를 표시한다.
- client/src/pages/Admin.tsx: 서버에 회원 목록을 요청한다.
- server/src/routes/admin.ts: 요청으로 받은 role 값이 ADMIN이면 회원 목록을 조회해서 응답한다.

## M5. 이상해 보이는 코드 후보 - AI 제안
1. server/src/routes/posts.ts 11줄
   - 검색창 입력값을 DB 검색 명령문에 그대로 넣는 것이 이상해 보인다.
2. server/src/routes/admin.ts 7~8줄
   - 사용자가 요청에 넣어 보내는 값으로 관리자 여부를 판단하는 것이 이상해 보인다.
3. server/src/routes/auth.ts 28줄
   - 로그인 실패 응답에 입력한 비밀번호를 포함하는 것이 이상해 보인다.

## AI 사용 메모
- 코드 위치와 역할 설명, M5의 코드 후보와 이유, 문서 초안 작성에 AI의 도움을 받았다.