# golden-image 기능명세서

## 1. 개요

`golden-image`는 Golden Image 운영 정보를 확인하고 관리하는 정적 HTML 화면이다.

본 화면은 별도 API 서버 없이 동작한다. 초기 데이터는 HTML fallback 데이터와 `golden-image.js`의 샘플 데이터를 사용하며, 사용자가 등록, 수정, 삭제한 데이터는 브라우저 `localStorage`에 저장한다.

## 2. 화면 구성

| 구분 | 파일 | 설명 |
| --- | --- | --- |
| 기준 화면 | `index.html` | Release Dashboard |
| 탭 화면 | `families.html` | Golden Families |
| 탭 화면 | `components.html` | Component Catalog |
| 탭 화면 | `matrix.html` | Compatibility Matrix |
| 공통 스타일 | `styles.css` | 레이아웃, 탭, 테이블, 모달, 버튼 스타일 |
| 공통 스크립트 | `golden-image.js` | 샘플 데이터, 렌더링, 등록/수정/삭제 처리 |

## 3. 메뉴 및 탭 기준

- 좌측 메뉴 영역에는 `golden-image` 메뉴 한 개만 표시한다.
- `golden-image` 메뉴는 4개 탭 화면에서 항상 active 상태로 표시한다.
- 4개 탭은 좌측 메뉴 안에 넣지 않는다.
- 4개 탭은 우측 본문의 `golden-image` 화면 내부에 표시한다.
- 탭은 슬라이드 탭 형식으로 제공한다.
- 현재 선택된 탭은 active 상태와 `aria-selected="true"`로 표시한다.

## 4. 슬라이드 탭

| 탭 | 연결 파일 | active 클래스 |
| --- | --- | --- |
| Release Dashboard | `index.html` | `tab-release` |
| Golden Families | `families.html` | `tab-families` |
| Component Catalog | `components.html` | `tab-components` |
| Compatibility Matrix | `matrix.html` | `tab-matrix` |

슬라이드 탭 요구사항:

- 탭 컨테이너는 `role="tablist"`를 사용한다.
- 각 탭 링크는 `role="tab"`을 사용한다.
- 현재 탭은 `aria-current="page"`를 사용한다.
- active 배경은 CSS `::before` 슬라이더로 표시한다.
- 화면 폭이 줄어들어도 탭 텍스트가 영역 안에서 유지되어야 한다.

## 5. 공통 CRUD 기능

각 탭 화면은 등록, 수정, 삭제 기능을 제공한다.

공통 동작:

- `등록` 버튼 클릭 시 공통 모달 폼을 연다.
- `수정` 버튼 클릭 시 선택 항목의 값을 모달 폼에 채워 연다.
- `삭제` 버튼 클릭 시 브라우저 확인 창을 표시한 뒤 삭제한다.
- 저장 후 현재 화면을 즉시 다시 렌더링한다.
- 저장 성공 시 toast 메시지를 표시한다.
- 데이터는 `localStorage` 키 `golden-image-static-crud-v2`에 저장한다.
- `localStorage` 접근이 제한된 환경에서는 현재 화면 메모리에서만 반영한다.

## 6. Release Dashboard

파일: `index.html`

목적:

- Golden Image 릴리스 현황을 확인한다.
- 릴리스 데이터를 등록, 수정, 삭제한다.
- Stage Composition을 확인한다.

요약 카드:

| 항목 | 설명 |
| --- | --- |
| Golden Images | 전체 릴리스 수 |
| Stable | stable 상태 릴리스 수 |
| Candidate | candidate 상태 릴리스 수 |
| Blocked | blocked 상태 릴리스 수 |

Recent Releases 표시 항목:

| 항목 | 설명 |
| --- | --- |
| Image | Golden Image 이름 |
| Family | Family 이름 |
| Runtime | 런타임 키 |
| Version | 릴리스 버전 |
| Status | stable, candidate, blocked |
| 작업 | 수정, 삭제 버튼 |
| Registry | Registry image |

등록/수정 입력 항목:

| 필드 | 필수 | 입력 방식 | 선택 값 |
| --- | --- | --- | --- |
| Image | 예 | text | - |
| Family | 예 | text | - |
| Runtime | 예 | text | - |
| Version | 예 | text | - |
| Status | 예 | select | `stable`, `candidate`, `blocked` |
| Registry | 예 | text | - |

Stage Composition 표시 단계:

- G0 Foundation
- G1 Accelerator
- G2 Language
- G3 Framework
- G4 ML Platform
- G5 IDE

## 7. Golden Families

파일: `families.html`

목적:

- Golden Image Family와 Variant 정보를 카드 형태로 확인한다.
- Family 데이터를 등록, 수정, 삭제한다.

표시 항목:

| 항목 | 설명 |
| --- | --- |
| Family | Family 이름 |
| Status | active, review, retired |
| Description | Family 설명 |
| Variant | Variant 이름 |
| Platform | 대상 플랫폼 |
| Stable | stable 수 |
| Support | 지원 기간 |
| 작업 | 수정, 삭제 버튼 |

등록/수정 입력 항목:

| 필드 | 필수 | 입력 방식 | 선택 값 |
| --- | --- | --- | --- |
| Family | 예 | text | - |
| Status | 예 | select | `active`, `review`, `retired` |
| Description | 아니오 | textarea | - |
| Variant | 예 | text | - |
| Platform | 예 | text | - |
| Stable | 예 | text | - |
| Support | 예 | text | - |

## 8. Component Catalog

파일: `components.html`

목적:

- Golden Image를 구성하는 G0~G5 Component를 확인한다.
- Component 데이터를 등록, 수정, 삭제한다.

표시 항목:

| 항목 | 설명 |
| --- | --- |
| Stage | G0~G5 단계 |
| Name | Component 이름 |
| Version | Component 버전 |
| Status | approved, candidate, draft, blocked, retired |
| Owner | 담당 조직 |
| Source | 소스 revision |
| 작업 | 수정, 삭제 버튼 |

등록/수정 입력 항목:

| 필드 | 필수 | 입력 방식 | 선택 값 |
| --- | --- | --- | --- |
| Stage | 예 | select | `G0`, `G1`, `G2`, `G3`, `G4`, `G5` |
| Name | 예 | text | - |
| Version | 예 | text | - |
| Status | 예 | select | `approved`, `candidate`, `draft`, `blocked`, `retired` |
| Owner | 예 | text | - |
| Source | 예 | text | - |

## 9. Compatibility Matrix

파일: `matrix.html`

목적:

- Framework와 Python/CUDA 조합의 호환성 상태를 확인한다.
- Matrix 행 데이터를 등록, 수정, 삭제한다.

표시 항목:

| 항목 | 설명 |
| --- | --- |
| Framework | Framework 이름 및 버전 |
| py311-cu121 | 조합 상태 |
| py312-cu124 | 조합 상태 |
| py313-cu124 | 조합 상태 |
| py312-cpu | 조합 상태 |
| 작업 | 수정, 삭제 버튼 |

상태값:

- supported
- review
- blocked

등록/수정 입력 항목:

| 필드 | 필수 | 입력 방식 | 선택 값 |
| --- | --- | --- | --- |
| Framework | 예 | text | - |
| py311-cu121 | 예 | select | `supported`, `review`, `blocked` |
| py312-cu124 | 예 | select | `supported`, `review`, `blocked` |
| py313-cu124 | 예 | select | `supported`, `review`, `blocked` |
| py312-cpu | 예 | select | `supported`, `review`, `blocked` |

## 10. Select 선택 값

| 화면 | 필드 | 선택 값 |
| --- | --- | --- |
| Release Dashboard | Status | `stable`, `candidate`, `blocked` |
| Golden Families | Status | `active`, `review`, `retired` |
| Component Catalog | Stage | `G0`, `G1`, `G2`, `G3`, `G4`, `G5` |
| Component Catalog | Status | `approved`, `candidate`, `draft`, `blocked`, `retired` |
| Compatibility Matrix | py311-cu121 | `supported`, `review`, `blocked` |
| Compatibility Matrix | py312-cu124 | `supported`, `review`, `blocked` |
| Compatibility Matrix | py313-cu124 | `supported`, `review`, `blocked` |
| Compatibility Matrix | py312-cpu | `supported`, `review`, `blocked` |

## 11. 데이터 저장 기준

- API 호출은 사용하지 않는다.
- 초기 샘플 데이터는 `golden-image.js`의 `defaults` 객체에 정의한다.
- 정적 HTML 미리보기 환경에서도 데이터가 보이도록 HTML fallback 데이터를 유지한다.
- 사용자가 CRUD를 수행하면 JS 렌더링 결과가 HTML fallback을 대체한다.
- 저장 위치는 브라우저 `localStorage`이다.
- 저장 키는 `golden-image-static-crud-v2`이다.

## 12. 접근성 기준

- 탭 컨테이너는 `role="tablist"`를 사용한다.
- 탭 항목은 `role="tab"`을 사용한다.
- 현재 탭은 `aria-selected="true"`와 `aria-current="page"`를 사용한다.
- 등록/수정 모달은 `role="dialog"`와 `aria-modal="true"`를 사용한다.
- 입력 필드는 `label`과 연결한다.

## 13. 반응형 기준

- 전체 배경은 흰색 계열을 유지한다.
- 데스크톱에서는 좌측 메뉴와 우측 본문을 2컬럼으로 표시한다.
- 모바일에서는 좌측 메뉴가 본문 위로 이동한다.
- Stage Composition은 화면 폭에 따라 자동 줄바꿈한다.
- 긴 registry, image, source 문자열은 줄바꿈되어 레이아웃을 밀지 않아야 한다.

## 14. 제한사항

- 서버 API 연동은 하지 않는다.
- 브라우저별 `localStorage`에 저장되므로 다른 브라우저나 다른 기기와 데이터가 공유되지 않는다.
- 파일을 직접 열었을 때 브라우저 보안 정책에 따라 저장소 접근이 제한될 수 있다.
- 저장소 접근이 제한된 경우 변경 내용은 현재 화면에서만 유지된다.
