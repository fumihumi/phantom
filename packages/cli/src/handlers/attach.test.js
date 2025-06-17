import { deepStrictEqual, rejects } from "node:assert";
import { describe, it, mock } from "node:test";
import {
  BranchNotFoundError,
  WorktreeAlreadyExistsError,
} from "@aku11i/phantom-core";
import { err, ok } from "@aku11i/phantom-shared";

const exitWithErrorMock = mock.fn((message, code) => {
  throw new Error(`Exit with code ${code}: ${message}`);
});
const outputLogMock = mock.fn();
const getGitRootMock = mock.fn();
const attachWorktreeCoreMock = mock.fn();
const shellInWorktreeMock = mock.fn();
const execInWorktreeMock = mock.fn();

mock.module("../errors.ts", {
  namedExports: {
    exitWithError: exitWithErrorMock,
    exitCodes: {
      validationError: 3,
      notFound: 2,
      generalError: 1,
      success: 0,
    },
  },
});

mock.module("../output.ts", {
  namedExports: {
    output: { log: outputLogMock },
  },
});

mock.module("@aku11i/phantom-git", {
  namedExports: {
    getGitRoot: getGitRootMock,
  },
});

mock.module("@aku11i/phantom-core", {
  namedExports: {
    attachWorktreeCore: attachWorktreeCoreMock,
    BranchNotFoundError,
    WorktreeAlreadyExistsError,
    shellInWorktree: shellInWorktreeMock,
    execInWorktree: execInWorktreeMock,
    loadConfig: mock.fn(() =>
      Promise.resolve({ ok: false, error: new Error("Config not found") }),
    ),
    createPhantomContext: mock.fn(() =>
      Promise.resolve({
        context: {
          gitRoot: "/mock/git/root",
          config: {},
          basePath: undefined,
        },
      }),
    ),
  },
});

const { attachHandler } = await import("./attach.ts");

describe("attachHandler", () => {
  it("should attach to existing branch successfully", async () => {
    exitWithErrorMock.mock.resetCalls();
    outputLogMock.mock.resetCalls();
    getGitRootMock.mock.mockImplementation(() => Promise.resolve("/repo"));
    attachWorktreeCoreMock.mock.mockImplementation(() =>
      Promise.resolve(ok("/repo/.git/phantom/worktrees/feature")),
    );

    await attachHandler(["feature"]);

    deepStrictEqual(exitWithErrorMock.mock.calls.length, 0);
    deepStrictEqual(
      outputLogMock.mock.calls[0].arguments[0],
      "Attached phantom: feature",
    );
    deepStrictEqual(attachWorktreeCoreMock.mock.calls[0].arguments, [
      "/repo",
      "feature",
      undefined,
    ]);
  });

  it("should exit with error when no branch name provided", async () => {
    exitWithErrorMock.mock.resetCalls();

    await rejects(async () => await attachHandler([]), /Exit with code 3/);

    deepStrictEqual(exitWithErrorMock.mock.calls[0].arguments, [
      "Missing required argument: branch name",
      3,
    ]);
  });

  it("should exit with error when both --shell and --exec are provided", async () => {
    exitWithErrorMock.mock.resetCalls();
    getGitRootMock.mock.resetCalls();
    attachWorktreeCoreMock.mock.resetCalls();

    await rejects(
      async () => await attachHandler(["feature", "--shell", "--exec", "ls"]),
      /Exit with code 3/,
    );

    deepStrictEqual(exitWithErrorMock.mock.calls[0].arguments, [
      "Cannot use both --shell and --exec options",
      3,
    ]);
    deepStrictEqual(getGitRootMock.mock.calls.length, 0);
    deepStrictEqual(attachWorktreeCoreMock.mock.calls.length, 0);
  });

  it("should handle BranchNotFoundError", async () => {
    exitWithErrorMock.mock.resetCalls();
    getGitRootMock.mock.mockImplementation(() => Promise.resolve("/repo"));
    attachWorktreeCoreMock.mock.mockImplementation(() =>
      Promise.resolve(err(new BranchNotFoundError("nonexistent"))),
    );

    await rejects(
      async () => await attachHandler(["nonexistent"]),
      /Exit with code 2/,
    );

    deepStrictEqual(exitWithErrorMock.mock.calls[0].arguments, [
      "Branch 'nonexistent' not found",
      2,
    ]);
  });

  it("should spawn shell when --shell flag is provided", async () => {
    exitWithErrorMock.mock.resetCalls();
    outputLogMock.mock.resetCalls();
    shellInWorktreeMock.mock.resetCalls();
    shellInWorktreeMock.mock.mockImplementation(() =>
      Promise.resolve(ok({ exitCode: 0 })),
    );
    getGitRootMock.mock.mockImplementation(() => Promise.resolve("/repo"));
    attachWorktreeCoreMock.mock.mockImplementation(() =>
      Promise.resolve(ok("/repo/.git/phantom/worktrees/feature")),
    );

    await attachHandler(["feature", "--shell"]);

    deepStrictEqual(shellInWorktreeMock.mock.calls[0].arguments, [
      "/repo",
      "feature",
      undefined,
    ]);
  });

  it("should execute command when --exec flag is provided", async () => {
    exitWithErrorMock.mock.resetCalls();
    outputLogMock.mock.resetCalls();
    execInWorktreeMock.mock.resetCalls();
    execInWorktreeMock.mock.mockImplementation(() =>
      Promise.resolve(ok({ exitCode: 0 })),
    );
    getGitRootMock.mock.mockImplementation(() => Promise.resolve("/repo"));
    attachWorktreeCoreMock.mock.mockImplementation(() =>
      Promise.resolve(ok("/repo/.git/phantom/worktrees/feature")),
    );

    process.env.SHELL = "/bin/bash";
    await attachHandler(["feature", "--exec", "echo hello"]);

    deepStrictEqual(execInWorktreeMock.mock.calls[0].arguments[0], "/repo");
    deepStrictEqual(execInWorktreeMock.mock.calls[0].arguments[1], "feature");
    const execArgs = execInWorktreeMock.mock.calls[0].arguments[2];
    deepStrictEqual(execArgs[0], "/bin/bash");
    deepStrictEqual(execArgs[1], "-c");
    deepStrictEqual(execArgs[2], "echo hello");
  });
});
