import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { getPhantomDirectory, getWorktreePath } from "./paths.ts";

describe("paths", () => {
  describe("getPhantomDirectory", () => {
    it("should return correct phantom directory path", () => {
      const gitRoot = "/test/repo";
      const result = getPhantomDirectory(gitRoot);
      strictEqual(result, "/test/repo/.git/phantom/worktrees");
    });

    it("should handle git root with trailing slash", () => {
      const gitRoot = "/test/repo/";
      const result = getPhantomDirectory(gitRoot);
      strictEqual(result, "/test/repo/.git/phantom/worktrees");
    });

    it("should handle Windows-style paths", () => {
      const gitRoot = "C:\\test\\repo";
      const result = getPhantomDirectory(gitRoot);
      // path.join normalizes separators based on the platform
      strictEqual(result.includes(".git"), true);
      strictEqual(result.includes("phantom"), true);
      strictEqual(result.includes("worktrees"), true);
    });

    describe("with basePath", () => {
      it("should return default path when basePath is undefined", () => {
        const gitRoot = "/test/repo";
        const result = getPhantomDirectory(gitRoot, undefined);
        strictEqual(result, "/test/repo/.git/phantom/worktrees");
      });

      it("should handle relative basePath", () => {
        const gitRoot = "/test/repo";
        const result = getPhantomDirectory(gitRoot, "../phantom-external");
        strictEqual(result, "/test/phantom-external");
      });

      it("should handle absolute basePath", () => {
        const gitRoot = "/test/repo";
        const result = getPhantomDirectory(gitRoot, "/tmp/phantom-worktrees");
        strictEqual(result, "/tmp/phantom-worktrees");
      });

      it("should handle nested relative basePath", () => {
        const gitRoot = "/test/repo";
        const result = getPhantomDirectory(gitRoot, "custom/phantom");
        strictEqual(result, "/test/repo/custom/phantom");
      });

      it("should handle complex relative basePath", () => {
        const gitRoot = "/test/repo";
        const result = getPhantomDirectory(gitRoot, "../../shared/worktrees");
        strictEqual(result, "/shared/worktrees");
      });

      it("should handle basePath with trailing slash", () => {
        const gitRoot = "/test/repo";
        const result = getPhantomDirectory(gitRoot, "../phantom-external/");
        // path.join normalizes paths and may add trailing slash
        strictEqual(result, "/test/phantom-external/");
      });
    });
  });

  describe("getWorktreePath", () => {
    it("should return correct worktree path", () => {
      const gitRoot = "/test/repo";
      const name = "feature-branch";
      const result = getWorktreePath(gitRoot, name);
      strictEqual(result, "/test/repo/.git/phantom/worktrees/feature-branch");
    });

    it("should handle names with special characters", () => {
      const gitRoot = "/test/repo";
      const name = "feature/branch-123";
      const result = getWorktreePath(gitRoot, name);
      strictEqual(
        result,
        "/test/repo/.git/phantom/worktrees/feature/branch-123",
      );
    });

    it("should handle empty name", () => {
      const gitRoot = "/test/repo";
      const name = "";
      const result = getWorktreePath(gitRoot, name);
      // path.join removes trailing slashes
      strictEqual(result, "/test/repo/.git/phantom/worktrees");
    });

    describe("with basePath", () => {
      it("should return default worktree path when basePath is undefined", () => {
        const gitRoot = "/test/repo";
        const name = "feature-branch";
        const result = getWorktreePath(gitRoot, name, undefined);
        strictEqual(result, "/test/repo/.git/phantom/worktrees/feature-branch");
      });

      it("should handle relative basePath for worktree path", () => {
        const gitRoot = "/test/repo";
        const name = "feature-branch";
        const result = getWorktreePath(gitRoot, name, "../phantom-external");
        strictEqual(result, "/test/phantom-external/feature-branch");
      });

      it("should handle absolute basePath for worktree path", () => {
        const gitRoot = "/test/repo";
        const name = "feature-branch";
        const result = getWorktreePath(gitRoot, name, "/tmp/phantom-worktrees");
        strictEqual(result, "/tmp/phantom-worktrees/feature-branch");
      });

      it("should handle worktree names with slashes and custom basePath", () => {
        const gitRoot = "/test/repo";
        const name = "feature/user-auth";
        const result = getWorktreePath(gitRoot, name, "../phantom-external");
        strictEqual(result, "/test/phantom-external/feature/user-auth");
      });

      it("should handle nested basePath with complex worktree names", () => {
        const gitRoot = "/test/repo";
        const name = "bugfix/issue-123";
        const result = getWorktreePath(gitRoot, name, "custom/phantom");
        strictEqual(result, "/test/repo/custom/phantom/bugfix/issue-123");
      });
    });
  });
});
