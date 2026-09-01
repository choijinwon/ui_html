# ui_html

Golden Image standalone HTML UI.

## Pages

- `index.html` - Release Dashboard
- `families.html` - Golden Families
- `components.html` - Component Catalog
- `matrix.html` - Compatibility Matrix
- `register.html` - 등록 화면
- `edit.html` - 수정 화면
- `security.html` - Security Gate
- `settings.html` - 설정

Shared files:

- `styles.css`
- `shell.js`
- `api.js`
- `screens/*.js`

## API

The UI calls the existing Golden Image Factory API at `/api/v1`.

If the API is hosted elsewhere, append an API override:

```text
index.html?api=http://127.0.0.1:8000/api/v1
```
