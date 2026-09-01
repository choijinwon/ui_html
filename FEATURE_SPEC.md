# golden-image 기능명세서

## 1. 개요

`golden-image`는 Golden Image 운영 정보를 보여주는 정적 HTML 화면이다.

API 연동은 사용하지 않으며, 화면에 필요한 데이터는 HTML 내부 샘플 데이터로 표시한다.

## 2. 화면 기준

- 기준 화면은 `index.html`이다.
- 좌측 메뉴에는 `golden-image` 메뉴가 표시된다.
- `golden-image` 메뉴는 4개 탭 화면에서 항상 active 상태로 표시된다.
- 본문 상단에는 4개 탭 메뉴가 표시된다.

## 3. 탭 메뉴

| 탭 | 파일 | 설명 |
| --- | --- | --- |
| Release Dashboard | `index.html` | Golden Image 릴리스 상태와 Stage Composition 표시 |
| Golden Families | `families.html` | Family와 Variant 정보 표시 |
| Component Catalog | `components.html` | G0~G5 Component 목록 표시 |
| Compatibility Matrix | `matrix.html` | Framework, Python, CUDA 조합 호환성 표시 |

## 4. 공통 레이아웃

- 흰색 배경을 사용한다.
- 상단에는 `golden-image` 제목과 탭 메뉴를 표시한다.
- 좌측 메뉴 영역에는 `golden-image` 메뉴를 표시한다.
- 우측 본문에는 현재 선택된 탭 화면을 표시한다.
- 모바일 화면에서는 좌측 메뉴가 상단 가로 메뉴 형태로 전환된다.

## 5. Release Dashboard

### 5.1 요약 카드

다음 운영 지표를 표시한다.

- Golden Images
- Stable
- Candidate
- Blocked

### 5.2 Recent Releases

Golden Image 릴리스 목록을 테이블로 표시한다.

표시 항목:

- Image
- Family
- Runtime
- Version
- Status
- Registry

### 5.3 Stage Composition

G0~G5 단계를 화면 사이즈에 맞게 카드 형태로 표시한다.

표시 단계:

- G0 Foundation
- G1 Accelerator
- G2 Language
- G3 Framework
- G4 ML Platform
- G5 IDE

## 6. Golden Families

Family별 Variant 정보를 카드와 테이블로 표시한다.

표시 항목:

- Family 이름
- Family 상태
- 설명
- Variant
- Platform
- Stable 수
- Support 기간

## 7. Component Catalog

Golden Image를 구성하는 Component 목록을 표시한다.

표시 항목:

- Stage
- Name
- Version
- Status
- Owner
- Source

## 8. Compatibility Matrix

Framework와 Python/CUDA 조합의 호환성 상태를 Matrix로 표시한다.

상태:

- supported
- review
- blocked

## 9. 비기능 요구사항

- 별도 서버나 API 없이 HTML 파일만으로 화면이 보여야 한다.
- 공통 스타일은 `styles.css`에서 관리한다.
- 4개 탭은 각각 독립 HTML 파일로 접근 가능해야 한다.
- `index.html`은 첫 화면이자 `golden-image` 메뉴의 기준 화면이다.
