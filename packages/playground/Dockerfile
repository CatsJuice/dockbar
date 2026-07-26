FROM node:24-alpine AS build-stage

WORKDIR /app
RUN corepack enable

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm config set store-dir /pnpm/store
COPY patches ./patches
COPY packages/dockbar/package.json packages/dockbar/package.json
COPY packages/playground/package.json packages/playground/package.json
COPY examples/nuxt3/package.json examples/nuxt3/package.json
COPY examples/vite-react/package.json examples/vite-react/package.json
COPY examples/vite-vue/package.json examples/vite-vue/package.json
ENV CYPRESS_INSTALL_BINARY=0 \
    SKIP_INSTALL_SIMPLE_GIT_HOOKS=1
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build:playground

FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/packages/playground/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
