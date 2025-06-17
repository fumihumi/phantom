import assert from "node:assert";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { createPhantomContext } from "./context.ts";

describe("PhantomContext", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "phantom-context-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("createPhantomContext with valid config", async () => {
    const config = {
      basePath: "custom/path",
      postCreate: {
        copyFiles: ["file1.txt"],
        commands: ["echo test"],
      },
    };

    await writeFile(
      path.join(tempDir, "phantom.config.json"),
      JSON.stringify(config),
    );

    const { context, configWarnings } = await createPhantomContext(tempDir);

    assert.strictEqual(context.gitRoot, tempDir);
    assert.deepStrictEqual(context.config, config);
    assert.strictEqual(context.basePath, "custom/path");
    assert.strictEqual(configWarnings, undefined);
  });

  test("createPhantomContext with config not found (silent)", async () => {
    // No config file created
    const { context, configWarnings } = await createPhantomContext(tempDir);

    assert.strictEqual(context.gitRoot, tempDir);
    assert.deepStrictEqual(context.config, {});
    assert.strictEqual(context.basePath, undefined);
    assert.strictEqual(configWarnings, undefined); // Should remain silent
  });

  test("createPhantomContext with invalid JSON", async () => {
    await writeFile(
      path.join(tempDir, "phantom.config.json"),
      "{ invalid json",
    );

    const { context, configWarnings } = await createPhantomContext(tempDir);

    assert.strictEqual(context.gitRoot, tempDir);
    assert.deepStrictEqual(context.config, {});
    assert.strictEqual(context.basePath, undefined);
    assert.strictEqual(Array.isArray(configWarnings), true);
    assert.strictEqual(configWarnings.length, 1);
    assert.strictEqual(
      configWarnings[0].startsWith("Configuration warning:"),
      true,
    );
  });

  test("createPhantomContext with invalid config format", async () => {
    await writeFile(
      path.join(tempDir, "phantom.config.json"),
      JSON.stringify({ basePath: 123 }), // basePath should be string
    );

    const { context, configWarnings } = await createPhantomContext(tempDir);

    assert.strictEqual(context.gitRoot, tempDir);
    assert.deepStrictEqual(context.config, {});
    assert.strictEqual(context.basePath, undefined);
    assert.strictEqual(Array.isArray(configWarnings), true);
    assert.strictEqual(configWarnings.length, 1);
    assert.strictEqual(
      configWarnings[0].startsWith("Configuration warning:"),
      true,
    );
  });

  test("createPhantomContext with empty config", async () => {
    await writeFile(
      path.join(tempDir, "phantom.config.json"),
      JSON.stringify({}),
    );

    const { context, configWarnings } = await createPhantomContext(tempDir);

    assert.strictEqual(context.gitRoot, tempDir);
    assert.deepStrictEqual(context.config, {});
    assert.strictEqual(context.basePath, undefined);
    assert.strictEqual(configWarnings, undefined);
  });
});
