import fs from "node:fs/promises";
import { type Result, err, ok } from "@aku11i/phantom-shared";
import { getWorktreePathFromDirectory } from "../paths.ts";
import { WorktreeAlreadyExistsError, WorktreeNotFoundError } from "./errors.ts";

export interface WorktreeExistsSuccess {
  path: string;
}

export interface WorktreeDoesNotExistSuccess {
  path: string;
}

export async function validateWorktreeExists(
  _gitRoot: string,
  worktreeDirectory: string,
  name: string,
): Promise<Result<WorktreeExistsSuccess, WorktreeNotFoundError>> {
  const worktreePath = getWorktreePathFromDirectory(worktreeDirectory, name);

  try {
    await fs.access(worktreePath);
    return ok({ path: worktreePath });
  } catch {
    return err(new WorktreeNotFoundError(name));
  }
}

export async function validateWorktreeDoesNotExist(
  _gitRoot: string,
  worktreeDirectory: string,
  name: string,
): Promise<Result<WorktreeDoesNotExistSuccess, WorktreeAlreadyExistsError>> {
  const worktreePath = getWorktreePathFromDirectory(worktreeDirectory, name);

  try {
    await fs.access(worktreePath);
    return err(new WorktreeAlreadyExistsError(name));
  } catch {
    return ok({ path: worktreePath });
  }
}

export async function validateWorktreeDirectoryExists(
  worktreeDirectory: string,
): Promise<boolean> {
  try {
    await fs.access(worktreeDirectory);
    return true;
  } catch {
    return false;
  }
}

export function validateWorktreeName(name: string): Result<void, Error> {
  if (!name || name.trim() === "") {
    return err(new Error("Phantom name cannot be empty"));
  }

  // Only allow alphanumeric, hyphen, underscore, dot, and slash
  const validNamePattern = /^[a-zA-Z0-9\-_.\/]+$/;
  if (!validNamePattern.test(name)) {
    return err(
      new Error(
        "Phantom name can only contain letters, numbers, hyphens, underscores, dots, and slashes",
      ),
    );
  }

  if (name.includes("..")) {
    return err(new Error("Phantom name cannot contain consecutive dots"));
  }

  return ok(undefined);
}
