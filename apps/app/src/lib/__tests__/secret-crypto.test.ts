import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { encryptSecret, decryptSecret } = await import("@/lib/secret-crypto");

const KEY_A = "chave-de-teste-a-que-deve-ser-longa-e-aleatoria-01";
const KEY_B = "chave-de-teste-b-que-deve-ser-longa-e-aleatoria-02";

const savedKey = process.env.SECRETS_ENCRYPTION_KEY;

afterEach(() => {
  if (savedKey === undefined) {
    delete process.env.SECRETS_ENCRYPTION_KEY;
  } else {
    process.env.SECRETS_ENCRYPTION_KEY = savedKey;
  }
});

describe("encryptSecret / decryptSecret", () => {
  it("cifra e decifra com AES-256-GCM usando a chave do env", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY_A;

    const cipher = encryptSecret("evo-api-key-super-secreta");

    expect(cipher).not.toBe("evo-api-key-super-secreta");
    expect(cipher.startsWith("enc:v1:")).toBe(true);
    expect(decryptSecret(cipher)).toBe("evo-api-key-super-secreta");
  });

  it("gera ciphertext diferente a cada chamada (IV aleatório)", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY_A;

    expect(encryptSecret("mesma-chave")).not.toBe(encryptSecret("mesma-chave"));
  });

  it("valor legado sem prefixo passa direto no decrypt", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY_A;

    expect(decryptSecret("evo-api-key-plaintext-legado")).toBe(
      "evo-api-key-plaintext-legado",
    );
  });

  it("sem chave no env, grava em claro (fail-open) e lê de volta", () => {
    delete process.env.SECRETS_ENCRYPTION_KEY;

    const stored = encryptSecret("evo-api-key-sem-chave");

    expect(stored).toBe("evo-api-key-sem-chave");
    expect(decryptSecret(stored)).toBe("evo-api-key-sem-chave");
  });

  it("chave errada não decifra (retorna null)", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY_A;
    const cipher = encryptSecret("evo-api-key-super-secreta");

    process.env.SECRETS_ENCRYPTION_KEY = KEY_B;

    expect(decryptSecret(cipher)).toBeNull();
  });

  it("ciphertext adulterado não decifra (GCM rejeita tag)", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY_A;
    const cipher = encryptSecret("evo-api-key-super-secreta");

    const [, iv, ct, tag] = cipher.split(":");
    const tampered = `enc:v1:${iv}:${ct.slice(0, -2)}xx:${tag}`;

    expect(decryptSecret(tampered)).toBeNull();
  });

  it("valor vazio/nulo decifra para null", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY_A;

    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret("")).toBeNull();
  });
});
