FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

ARG ETF_DEPLOYMENT_PROFILE=generic
ARG ETF_ENTERPRISE_RELEASE=0
ENV ETF_DEPLOYMENT_PROFILE=${ETF_DEPLOYMENT_PROFILE}
ENV ETF_ENTERPRISE_RELEASE=${ETF_ENTERPRISE_RELEASE}

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV ETF_TRUST_AUTH_PROXY=0

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node server.mjs ./server.mjs

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
