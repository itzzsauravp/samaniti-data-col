import { SelectorProfile } from "../../core/contracts/site-config.js";
import { drupal7 } from "./drupal7.js";
import { generic } from "./generic.js";
import { wordpress } from "./wordpress.js";

const PROFILES: Record<string, SelectorProfile> = {
  drupal7,
  drupal: drupal7,
  wordpress,
  wp: wordpress,
  generic,
};

export const DEFAULT_STACK = "generic";

/** Returns the selector profile for a stack, falling back to the generic one. */
export function getSelectorProfile(stack: string): SelectorProfile {
  return PROFILES[stack] ?? PROFILES.generic;
}

export { drupal7, generic, wordpress };