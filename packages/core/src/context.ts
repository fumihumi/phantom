import { type Result, isOk } from "@aku11i/phantom-shared";
import {
  ConfigNotFoundError,
  ConfigParseError,
  loadConfig,
  type PhantomConfig,
} from "./config/loader.ts";
import { ConfigValidationError } from "./config/validate.ts";

/**
 * Represents the context for all phantom operations.
 * 
 * This context encapsulates the git repository root, loaded configuration,
 * and derived basePath, eliminating the need to pass basePath parameters
 * through multiple function calls.
 */
export interface PhantomContext {
  /** The root directory of the git repository */
  gitRoot: string;
  /** The loaded phantom configuration */
  config: PhantomConfig;
  /** The resolved base path for worktrees, derived from config */
  basePath?: string;
}

/**
 * Result type for context creation, including potential configuration warnings
 */
export interface CreateContextResult {
  context: PhantomContext;
  configWarnings?: string[];
}

/**
 * Creates a PhantomContext by loading configuration and resolving basePath.
 * 
 * This function centralizes configuration loading logic that was previously
 * duplicated across multiple CLI handlers. Configuration errors are handled
 * gracefully, with warnings collected for optional display to users.
 *
 * @param gitRoot - The root directory of the git repository
 * @returns A context object with loaded configuration and resolved basePath
 * 
 * @example
 * ```typescript
 * const gitRoot = await getGitRoot();
 * const { context, configWarnings } = await createPhantomContext(gitRoot);
 * 
 * if (configWarnings) {
 *   configWarnings.forEach(warning => console.warn(warning));
 * }
 * 
 * // Use context in operations
 * await createWorktree(context, "my-worktree", options);
 * ```
 */
export async function createPhantomContext(
  gitRoot: string,
): Promise<CreateContextResult> {
  const configWarnings: string[] = [];
  let config: PhantomConfig = {};

  const configResult = await loadConfig(gitRoot);
  if (isOk(configResult)) {
    config = configResult.value;
  } else {
    // Collect configuration warnings for validation and parse errors
    // ConfigNotFoundError remains silent as the config file is optional
    if (configResult.error instanceof ConfigValidationError) {
      configWarnings.push(`Configuration warning: ${configResult.error.message}`);
    } else if (configResult.error instanceof ConfigParseError) {
      configWarnings.push(`Configuration warning: ${configResult.error.message}`);
    }
  }

  const context: PhantomContext = {
    gitRoot,
    config,
    basePath: config.basePath,
  };

  return {
    context,
    configWarnings: configWarnings.length > 0 ? configWarnings : undefined,
  };
}