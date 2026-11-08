# 10주차 팀 실습 기록 (B 범위)

- B 범위 담당: 이충성
- 관련 요구사항: R10-5, R10-6

## B-1. 본문 저장과 출력

본문(content)이 입력부터 화면 출력까지 거치는 경로를 따라갔다.

1. 글쓰기 화면에서 본문 입력
   - 파일: `client/src/pages/PostForm.tsx`
   - 본문은 `textarea`(id=`content`)에 입력되고 `content` 상태에 저장된다.

2. POST 요청의 content 확인
   - 코드: `api("/api/posts", "POST", {title, content})` (PostForm.tsx:26)
   - 요청 본문(Payload)에 `content` 값이 그대로 실려 간다.

3. 서버 입력과 DB 저장 코드
   - 파일: `server/src/routes/posts.ts`
   - 입력: `const { title, content, userId } = req.body ?? {};` (52줄)
   - 검사: 문자열인지, 길이 1~5000자인지 확인한다. (54~58줄)
   - 저장: `INSERT INTO posts(user_id, title, content) VALUES (?, ?, ?)` (67~68줄)
   - 서버는 본문을 **HTML 태그가 들어 있어도 그대로 저장**한다. 저장 시점에는 태그를 지우지 않는다.

4. 상세 조회 응답의 content 확인
   - `GET /api/posts/:id` 응답의 `content`에 저장된 본문이 그대로 들어 있다.

5. PostView의 최종 출력
   - 파일: `client/src/pages/PostView.tsx`
   - 수정 전: 응답의 `post.content`를 `dangerouslySetInnerHTML`로 그대로 출력했다.

전체 흐름:  
본문 입력 → POST 요청의 content → 서버에서 req.body 읽기·검사 → DB 저장 → 상세 조회 응답 → PostView에서 HTML로 출력

## B-2. 본문 정화와 서식 (R10-5, R10-6)

### 외부입력

글쓰기·수정 요청의 `req.body.content`. 사용자가 마음대로 바꿀 수 있는 값이다.

### 수정 전 문제

- 파일: `client/src/pages/PostView.tsx`, 본문 출력 부분
- 받아온 본문을 검사 없이 `dangerouslySetInnerHTML`로 HTML로 출력했다. 본문에 `<img src=x onerror=...>`나 `<script>` 같은 값을 넣으면 글을 보는 다른 사용자의 브라우저에서 스크립트가 실행되는 저장형 XSS가 된다.

### 수정 내용

```tsx
const safeContent = DOMPurify.sanitize(post.content, {
  ALLOWED_TAGS: ["b", "i", "u", "br"],
  ALLOWED_ATTR: [],
});
...
<div className="content" dangerouslySetInnerHTML={{__html: safeContent}} />
```

- 본문은 굵게·기울임·밑줄·줄바꿈 서식이 필요해서 HTML 출력은 유지한다.
- 대신 DOMPurify로 정화해서 허용한 태그(`b`, `i`, `u`, `br`)만 남기고, 속성은 하나도 허용하지 않는다. 허용 목록 방식이라 빠뜨리는 태그가 생기지 않는다.
- `onerror`, `onclick`, `href="javascript:..."` 같은 속성이 모두 제거된다.
- 출력에는 정화 결과(`safeContent`)만 사용한다.
- 라이브러리 `dompurify`를 `client`에 추가했다.

### 고친 후 결과

| 확인 | 입력 예 | 결과 |
|---|---|---|
| 정상 서식 | `<b>굵게</b><i>기울임</i><u>밑줄</u>`, `<br>` | 서식이 그대로 보임 |
| 스크립트 | `<script>alert(1)</script>` | 실행되지 않음 |
| 이벤트 속성 | `<img src=x onerror=alert(1)>` | 실행되지 않음 |
| 허용 태그의 속성 | `<b onmouseover="alert(1)">글</b>` | 속성이 제거됨 |

서식이 사라졌다면 R10-6을 다시 확인한다.

### 이 줄을 지우면?

- `DOMPurify.sanitize`를 빼고 `post.content`를 그대로 출력하면 본문 속 스크립트가 다시 실행된다.
- `ALLOWED_ATTR: []`를 지우면 DOMPurify 기본 설정이 적용되어, 허용 태그에 `class`, `style` 같은 속성이 남을 수 있다. 속성을 하나도 허용하지 않는다는 정책이 깨진다.

## B-3. 제목 강조와 댓글

### 외부입력

게시글의 `title`. 검색 시 제목 안의 검색어를 강조해서 보여 준다.

### 수정 전 문제

- 파일: `client/src/pages/PostList.tsx`, `highlight` 함수와 제목 출력 부분
- `highlight`가 제목 문자열에 `<mark>${keyword}</mark>`를 이어 붙인 HTML 문자열을 만들고, 이를 `dangerouslySetInnerHTML`로 출력했다. 제목에 HTML이 들어 있으면 목록 화면에서 그대로 해석된다.

### 수정 내용

```tsx
function highlight(text: string, keyword: string) {
  return text.split(keyword).map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <mark>{keyword}</mark>}
      {part}
    </Fragment>
  ));
}
...
{searched ? highlight(p.title, searched) : p.title}
```

- HTML 문자열 조합과 `dangerouslySetInnerHTML`을 없앴다.
- 제목을 검색어 기준으로 나누고, 사이에 `<mark>{keyword}</mark>`를 JSX 요소로 넣는다.
- 제목 조각은 JSX 텍스트로 출력되므로 React가 자동으로 이스케이프한다. 제목에 HTML이 있어도 글자 그대로 보인다.
- 기존 검색 강조 기능은 유지된다.

### 댓글

- 댓글은 `<p>{c.content}</p>`로 출력하고 있어 JSX 기본 이스케이프가 적용된다. 변경하지 않고 유지했다.

### 고친 후 결과

| 확인 | 입력 예 | 결과 |
|---|---|---|
| 정상 검색 강조 | 일반 제목 검색 | 검색어에만 강조(`mark`) |
| 공격성 제목 | 제목 `<img src=x onerror=alert(1)>` 검색 | 글자 그대로 표시, 실행 안 됨 |

### 이 줄을 지우면?

- 제목을 다시 HTML 문자열로 조합해서 `dangerouslySetInnerHTML`로 출력하면 제목 속 스크립트가 다시 실행된다.

### 출력 정책이 다른 이유

| 대상 | 출력 방식 | 이유 |
|---|---|---|
| 본문 | 정화(sanitize) 후 HTML 출력 | 굵게·기울임 같은 서식이 필요하다. 그래서 HTML 출력이 필요하고, 위험을 줄이기 위해 정화가 꼭 필요하다. |
| 제목 | JSX 텍스트 출력 | 서식이 필요 없다. HTML로 해석할 경로 자체를 없앴다. |
| 댓글 | JSX 텍스트 출력 | 서식이 필요 없고, 기본 이스케이프로 충분하다. |

정리: 서식이 필요하면 HTML 출력과 정화를, 필요 없으면 텍스트 출력을 쓴다.

## AI 사용 메모

- AI(Claude)가 본문 정화에 DOMPurify 라이브러리 사용을 제안하고 `dompurify`를 설치·추가했다. 
- 취약한 위치를 찾고 원인을 설명하는 것은 직접 했고, 수정 코드는 AI와 함께 작성했다.
