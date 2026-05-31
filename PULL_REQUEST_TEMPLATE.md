## Summary
- 

## Change type
- [ ] Frontend/UI
- [ ] Backend/API
- [ ] Full-stack
- [ ] Docs-only

## Testing checklist
- [ ] I ran dependency install if needed: `npm ci --prefix backend && npm ci --prefix frontend`
- [ ] Frontend build (if frontend touched): `NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=384" CI=false npm run build --prefix frontend`
- [ ] Backend health check (if backend touched): `curl http://localhost:5000/api/health`
- [ ] I manually verified changed behavior (browser/API as applicable)
- [ ] If visual snapshots changed, I confirmed the UI change is intentional and included before/after evidence.
- [ ] If docs-only/copy-only: I noted that runtime checks were not required

## Evidence
- Commands run:
  - 
- Manual verification notes:
  - 
