import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { neonConfig } from "@neondatabase/serverless";

import {
  configureNeonLocal,
  drizzleKitUrl,
  isNeonLocal,
  neonLocalFetchEndpoint,
} from "../neon-config";

const REMOTE_URL = "postgres://user:pass@ep-cool.neon.tech/neondb?sslmode=require";
const LOCAL_URL = "postgres://neon:npg@localhost:5432/neondb?sslmode=require";

const ORIGINAL = {
  NEON_LOCAL: process.env.NEON_LOCAL,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  NEON_LOCAL_SQL_ENDPOINT: process.env.NEON_LOCAL_SQL_ENDPOINT,
};

beforeEach(() => {
  delete process.env.NEON_LOCAL;
  delete process.env.NEON_LOCAL_SQL_ENDPOINT;
});

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("isNeonLocal", () => {
  it("detecta hosts locais sem precisar da flag", () => {
    process.env.DATABASE_URL = LOCAL_URL;
    expect(isNeonLocal()).toBe(true);
  });

  it("respeita NEON_LOCAL=false mesmo com host local", () => {
    process.env.DATABASE_URL = LOCAL_URL;
    process.env.NEON_LOCAL = "false";
    expect(isNeonLocal()).toBe(false);
  });

  it("não ativa o modo local para URLs remotas", () => {
    process.env.DATABASE_URL = REMOTE_URL;
    expect(isNeonLocal()).toBe(false);
  });

  it("respeita NEON_LOCAL=true explicitamente", () => {
    process.env.DATABASE_URL = REMOTE_URL;
    process.env.NEON_LOCAL = "true";
    expect(isNeonLocal()).toBe(true);
  });
});

describe("configureNeonLocal", () => {
  it("não altera o driver em produção", () => {
    process.env.DATABASE_URL = REMOTE_URL;
    const before = {
      endpoint: neonConfig.fetchEndpoint,
      secure: neonConfig.useSecureWebSocket,
      fetch: neonConfig.poolQueryViaFetch,
    };
    expect(configureNeonLocal()).toBe(false);
    expect(neonConfig.fetchEndpoint).toBe(before.endpoint);
    expect(neonConfig.useSecureWebSocket).toBe(before.secure);
    expect(neonConfig.poolQueryViaFetch).toBe(before.fetch);
  });

  it("configura HTTP no modo local", () => {
    process.env.DATABASE_URL = LOCAL_URL;
    expect(configureNeonLocal()).toBe(true);
    expect(neonConfig.fetchEndpoint).toBe("http://localhost:5432/sql");
    expect(neonConfig.useSecureWebSocket).toBe(false);
    expect(neonConfig.poolQueryViaFetch).toBe(true);
  });

  it("aceita endpoint customizado", () => {
    process.env.DATABASE_URL = LOCAL_URL;
    process.env.NEON_LOCAL_SQL_ENDPOINT = "http://db:5432/sql";
    configureNeonLocal();
    expect(neonLocalFetchEndpoint()).toBe("http://db:5432/sql");
    expect(neonConfig.fetchEndpoint).toBe("http://db:5432/sql");
  });
});

describe("drizzleKitUrl", () => {
  it("mantém sslmode=require em produção", () => {
    process.env.DATABASE_URL = REMOTE_URL;
    expect(drizzleKitUrl()).toBe(REMOTE_URL);
  });

  it("usa sslmode=no-verify apenas para host local", () => {
    process.env.DATABASE_URL = LOCAL_URL;
    expect(drizzleKitUrl()).toContain("sslmode=no-verify");
  });
});
