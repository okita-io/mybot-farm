# Mock mybot.farm API — local source for the KiroCrew plant/post plugin.
# The real ../packs catalog is copied in as seed data at build time; seller
# POSTs are held in memory (get-after-put round-trips), reset on restart.
FROM node:22-alpine

WORKDIR /app
COPY mock-farm/package.json ./package.json
COPY mock-farm/server.mjs ./server.mjs
COPY mock-farm/smoke.mjs ./smoke.mjs

# Seed catalog: copy the real agent/team packs the site ships.
COPY packs/agents ./packs/agents
COPY packs/teams ./packs/teams

ENV PORT=8787 MOCK_SEED_DIR=/app/packs MOCK_API_KEY=mbf_mocktoken
EXPOSE 8787
CMD ["node", "server.mjs"]
