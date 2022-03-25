import { Config } from '../index'

export type IgnoredPackages = { [key: string]: boolean | string[] }

export declare function loadConfig(
  mode: 'internal' | 'external',
  directory: string
): Promise<Config>

export declare function findLockFilePath(
  mode: 'internal' | 'external',
  directory: string
): Promise<string>

export declare function omit(
  keys: string[],
  object: Record<string, unknown>
): Record<string, unknown>

export declare function pick(
  keys: string[],
  object: Record<string, unknown>
): Record<string, unknown>

export declare function isFileExist(filePath: string): Promise<boolean>

export declare function loadIgnoreFile(directory: string): Promise<IgnoredPackages>

export declare function resolveMode(directory: string): 'internal' | 'external'
