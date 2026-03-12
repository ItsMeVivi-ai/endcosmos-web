# EndCosmos Copilot Agent Instructions

## Project stack

- Frontend static in `public/` (HTML/CSS/JS).
- Backend FastAPI in `backend/app`.
- Nginx config in `nginx/endcosmos.conf`.

## High-priority workflows

1. For image updates:
   - Add or remove files in `public/assets/zogs`, `public/assets/zogs/v1`, `public/assets/zogs/v2`, `public/assets/zogs/catalog`.
   - Run `python backend/scripts/generate_gallery_manifests.py`.
   - Do not hardcode long image lists in HTML.
2. For web validation:
   - Run VS Code task `Web: Validate all`.
3. For backend run:
   - Run VS Code task `Backend: Run API`.

## Security guardrails

- Never commit secrets or real credentials.
- Keep `SECRET_KEY` strong (32+ chars) in production.
- Respect `ALLOWED_ORIGINS`, `ALLOWED_HOSTS`, and `TRUST_PROXY_HEADERS`.
- Do not weaken `TrustedHostMiddleware` or security headers without explicit request.

## Editing rules

- Prefer minimal diffs and keep current visual style.
- Maintain accessibility (`alt`, `aria-*`, keyboard navigation).
- Keep paths under `/assets/...` stable for Nginx static serving.
