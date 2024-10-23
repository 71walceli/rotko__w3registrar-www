FROM oven/bun:canary-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --verbose

# Use bunx to run 'papi' commands without full paths
RUN bunx papi add -n polkadot_people people_polkadot
RUN bunx papi add -n ksmcc3_people people_kusama
RUN bunx papi add -n westend2_people people_westend
RUN bunx papi add -n rococo_v2_2_people people_rococo

FROM dependencies AS builder
COPY . .
RUN bunx tsc-silent -p './tsconfig.json' --suppress @
RUN bunx vite build -v

FROM base AS production
COPY --from=builder /app/dist /app/dist
RUN bun add serve
CMD ["bun", "run", "serve", "--single", "dist"]

FROM dependencies AS development
COPY . .
CMD ["bun", "run", "dev"]
