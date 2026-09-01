# Golden Image UI 기능명세서

## 1. 개요

Golden Image UI는 Golden Image Factory API와 연동하여 Golden Image 릴리스, Family/Variant, Component, Compatibility Rule, Security Gate, 운영 설정을 관리하는 정적 HTML 기반 운영 콘솔이다.

본 UI는 화면별 HTML 파일과 공통 JavaScript 모듈로 구성되며, 기본 API 경로는 `/api/v1`이다.

## 2. 대상 사용자

- ML Platform 운영자
- Golden Image 관리자
- Component 승인 담당자
- Security Gate 승인 담당자
- 배포/런타임 호환성 검토자

## 3. 화면 구성

| 화면 | 파일 | 주요 목적 |
| --- | --- | --- |
| Release Dashboard | `index.html` | Golden Image 릴리스 목록, 상세, 빌드, 승격 상태 확인 |
| Golden Families | `families.html` | Family 및 Variant 관리 |
| Component Catalog | `components.html` | G0~G5 Component 등록, 검증, 승인, 영향 분석 |
| Compatibility Matrix | `matrix.html` | Component 조합 호환성 Rule 및 Matrix 확인 |
| 등록 화면 | `register.html` | Family, Variant, Component, Rule, Recipe 등록 |
| 수정 화면 | `edit.html` | 기존 API가 지원하는 변경 작업 수행 |
| Security Gate | `security.html` | Release 보안 검토, 승인, 예외 처리 |
| 설정 | `settings.html` | GitLab 및 패키지 프록시 설정 |

## 4. 공통 기능

### 4.1 API 연동

- 기본 API Base URL은 `/api/v1`이다.
- 별도 API 서버를 사용할 경우 URL query로 지정한다.

```text
index.html?api=http://127.0.0.1:8000/api/v1
```

### 4.2 공통 레이아웃

- 흰색 배경 기반 운영 콘솔 UI를 사용한다.
- 상단에 `Golden Image` 브랜드 영역을 표시한다.
- 본문 좌측에 메뉴 영역을 표시한다.
- 좌측 메뉴의 대표 항목은 `golden-image`이다.
- 주요 4개 메뉴는 탭 형태로 제공한다.
- 등록, 수정, Security, 설정은 상단 빠른 액션 버튼으로 제공한다.

### 4.3 공통 UI 컴포넌트

- Badge: 상태 표시
- Table: 목록 및 상세 데이터 표시
- Modal: 상세 보기, 승인, 예외 승인, Dockerfile 보기
- Toast: 작업 성공/실패 알림
- Form Modal: 등록/승인/변경 입력 폼

## 5. Release Dashboard

### 5.1 릴리스 목록 조회

- API: `GET /images`
- 전체 Golden Image 릴리스 목록을 표시한다.
- Family, Runtime, Release, State, Channel, Registry Image, Digest, 생성일을 확인할 수 있다.
- 상태, Family, Runtime, 검색 조건으로 필터링할 수 있다.

### 5.2 릴리스 상세 조회

- API:
  - `GET /releases/{releaseId}`
  - `GET /recipes/{recipeId}`
  - `GET /builds?releaseId={releaseId}`
  - `GET /releases/{releaseId}/usage`
- 릴리스 행 클릭 시 상세 화면을 표시한다.
- Stage DAG를 G0~G5 순서로 보여준다.
- 각 Stage 노드를 클릭하면 연결된 Component 상세를 확인할 수 있다.

### 5.3 빌드 작업

- API: `POST /builds`
- 지원 모드:
  - 변경 사항 빌드
  - 선택 Stage부터 재빌드
  - Stage 검증
- 빌드 결과, Gate 결과, Cache hit 정보를 표시한다.

### 5.4 Dockerfile 보기

- API:
  - `GET /builds/{buildId}/dockerfiles`
  - `GET /recipes/{recipeId}/dockerfiles`
- 각 Stage별 Dockerfile을 모달에서 확인할 수 있다.
- Dockerfile 내용을 클립보드에 복사할 수 있다.

### 5.5 Recipe 보기

- API: `GET /recipes?variantId={variantId}`
- Recipe revision 목록과 spec JSON을 확인할 수 있다.
- Git 연동 정보가 있으면 Git revision을 표시한다.

## 6. Golden Families

### 6.1 Family 목록 조회

- API: `GET /families`
- Family 카드 목록을 표시한다.
- 상태 필터를 제공한다.
  - 전체
  - active
  - deprecated
  - retired

### 6.2 Variant 목록 조회

- API: `GET /families/{familyId}/variants`
- Family 카드를 클릭하면 Variant 목록을 확장 표시한다.
- Platform, Runtime Key, 지원 종료일, Stable Release를 표시한다.

### 6.3 Family 등록

- API: `POST /families`
- 입력 항목:
  - name
  - displayName
  - ownerTeam
  - description

### 6.4 Variant 등록

- API: `POST /families/{familyId}/variants`
- 입력 항목:
  - platform
  - runtimeKey
  - supportEndAt

## 7. Component Catalog

### 7.1 Component 목록 조회

- API: `GET /components`
- G0~G5 전체 Component를 표시한다.
- Stage, 상태, 이름 검색 필터를 제공한다.

### 7.2 Component 등록

- API: `POST /components`
- 입력 항목:
  - stage
  - name
  - version
  - ownerTeam
  - imageDigest
  - sourceRevision
  - metadata
- 등록 시 기본 상태는 API 정책에 따른다.

### 7.3 Component 상세 보기

- Component build metadata를 표시한다.
- Dockerfile 관련 구성값을 표시한다.
  - base
  - packageManager
  - packages
  - pip
  - run
  - env
  - entrypoint
  - cmd
- CVE 시뮬레이션 metadata가 있으면 함께 표시한다.

### 7.4 Component 검증

- API: `POST /components/{componentId}/verify`
- Stage contract test 결과를 표시한다.
- 검증 결과에 따라 상태 badge를 갱신한다.

### 7.5 Component 승인

- API: `POST /components/{componentId}/approve`
- 입력 항목:
  - approver
  - reason
- candidate 상태 Component를 approved로 승격한다.

### 7.6 새 버전 등록

- API: `POST /components/{componentId}/versions`
- 기존 Component 기준으로 새 version을 등록한다.
- 입력 항목:
  - version
  - imageDigest
  - sourceRevision
  - metadata

### 7.7 영향 분석

- API: `GET /components/{componentId}/impact`
- 해당 Component를 참조하는 Golden Image 목록을 표시한다.
- 영향 Stage와 참조 버전 여부를 확인할 수 있다.

## 8. Compatibility Matrix

### 8.1 Matrix 조회

- API: `GET /compatibility/matrix`
- Row Stage와 Column Stage를 선택하여 Component 조합 Matrix를 표시한다.
- 상태:
  - supported
  - review
  - blocked
  - unbuilt

### 8.2 셀 상세 확인

- Matrix 셀 클릭 시 선택 조합의 Rule 적용 내역을 표시한다.
- 빌드 성공 이력 여부를 표시한다.

### 8.3 Rule 목록 조회

- API: `GET /compatibility/rules`
- 등록된 전체 Compatibility Rule을 표시한다.

### 8.4 Rule 등록

- API: `POST /compatibility/rules`
- 입력 항목:
  - name
  - status
  - subjectStage
  - subjectName
  - subjectVersion
  - objectStage
  - objectName
  - objectVersion
  - reason

## 9. 등록 화면

등록 화면은 운영자가 주요 리소스를 한 화면에서 생성할 수 있도록 제공한다.

### 9.1 Family 등록

- `POST /families`를 호출한다.

### 9.2 Variant 등록

- `POST /families/{familyId}/variants`를 호출한다.
- Family 목록을 먼저 조회한 뒤 선택한다.

### 9.3 Component 등록

- `POST /components`를 호출한다.
- metadata는 JSON 문자열로 입력하며, 유효하지 않은 JSON이면 등록하지 않는다.

### 9.4 Compatibility Rule 등록

- `POST /compatibility/rules`를 호출한다.

### 9.5 Golden Image Recipe 등록

- API:
  - `GET /families`
  - `GET /families/{familyId}/variants`
  - `GET /components`
  - `POST /recipes/validate`
  - `POST /recipes`
- Family와 Variant를 선택한다.
- G0~G5 Stage별 Component를 선택한다.
- 저장 전에 Recipe validation을 수행할 수 있다.
- blocked 조합이면 API 정책에 따라 저장이 거부된다.

## 10. 수정 화면

백엔드가 현재 제공하는 변경 API 범위 안에서 수정 기능을 제공한다.

### 10.1 Component 새 버전 등록

- API: `POST /components/{componentId}/versions`
- 기존 Component의 직접 수정 대신 새 version 생성 방식으로 변경한다.

### 10.2 Component 검증/승인

- API:
  - `POST /components/{componentId}/verify`
  - `POST /components/{componentId}/approve`
- 검증 결과와 승인 결과를 화면에 표시한다.

### 10.3 Release 상태 변경

- API:
  - `POST /releases/{releaseId}/promote`
  - `POST /releases/{releaseId}/deprecate`
  - `POST /releases/{releaseId}/revoke`
  - `POST /releases/{releaseId}/retire`
- 지원 작업:
  - stable 승격
  - deprecated 처리
  - revoke
  - retire

### 10.4 설정 수정

- API:
  - `PUT /settings/git`
  - `PUT /settings/proxy`
  - `POST /settings/git/test`
- GitLab URL, Project, Branch, Recipe Directory를 수정한다.
- PIP Index URL, PIP Trusted Host, APT Proxy를 수정한다.
- Git 연결 테스트를 실행할 수 있다.

## 11. Security Gate

### 11.1 Release 선택

- API:
  - `GET /releases`
  - `GET /releases/{releaseId}`
- 검토할 Release를 선택한다.

### 11.2 Gate 결과 확인

- 최신 Build의 Gate 결과를 표시한다.
- 보안 Finding, SBOM, Provenance, Signature 정보를 확인한다.

### 11.3 Finding 예외 승인

- API: `POST /releases/{releaseId}/findings/{findingId}/exception`
- 입력 항목:
  - approver
  - expiresAt
  - reason

### 11.4 승인/반려

- API: `POST /releases/{releaseId}/approvals`
- 승인 종류별 승인/반려를 기록한다.

### 11.5 Release 생명주기 변경

- Security Gate 화면에서도 promote, deprecate, revoke, retire 작업을 수행할 수 있다.

## 12. 설정 화면

### 12.1 Git 설정

- Git backend, GitLab URL, Project, Branch, Recipe Directory, Token 설정을 관리한다.
- Token은 write-only이며 조회 시 마스킹된다.

### 12.2 Proxy 설정

- 패키지 프록시 설정을 관리한다.
- pipIndexUrl, pipTrustedHost, aptProxy를 설정한다.

## 13. 상태 정의

### 13.1 Component 상태

- draft
- candidate
- approved
- blocked
- retired

### 13.2 Release 상태

- draft
- candidate
- approved
- stable
- building
- verifying
- blocked
- deprecated
- revoked
- failed
- retired

### 13.3 Compatibility 상태

- supported
- review
- blocked
- unbuilt

## 14. 예외 및 오류 처리

- API 오류 발생 시 Toast 또는 화면 내 메시지로 오류를 표시한다.
- JSON 입력이 필요한 필드는 파싱 오류 발생 시 API 호출을 수행하지 않는다.
- 조회 데이터가 없는 경우 empty 상태 문구를 표시한다.
- 네트워크/API 서버 미연결 시 화면 로딩 실패 메시지를 표시한다.

## 15. 비기능 요구사항

- 별도 빌드 도구 없이 정적 HTML/JS/CSS로 제공 가능해야 한다.
- FastAPI 정적 파일 경로 또는 일반 HTTP 서버에서 제공 가능해야 한다.
- 화면별 HTML 파일로 분리되어 직접 URL 접근이 가능해야 한다.
- 주요 4개 메뉴는 탭 형태로 유지해야 한다.
- 운영 콘솔은 흰색 배경 기반의 명확한 테이블/폼 UI를 사용해야 한다.

## 16. 제한사항

- 현재 백엔드는 일반적인 Component/Family/Variant 직접 수정 `PUT/PATCH` API를 제공하지 않는다.
- 따라서 수정 화면은 직접 수정 대신 다음 API 기반 작업으로 구성한다.
  - Component 새 버전 등록
  - Component 검증/승인
  - Release 상태 변경
  - 운영 설정 수정
- 브라우저에서 파일을 직접 열 경우 API 호출은 CORS 또는 상대 경로 문제를 만날 수 있으므로 HTTP 서버를 통해 제공하는 것을 권장한다.
