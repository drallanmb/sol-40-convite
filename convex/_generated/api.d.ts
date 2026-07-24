/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as rsvpInternal from "../rsvpInternal.js";
import type * as rsvpModel from "../rsvpModel.js";
import type * as rsvpRateLimits from "../rsvpRateLimits.js";
import type * as rsvpSecurity from "../rsvpSecurity.js";
import type * as rsvpTest from "../rsvpTest.js";
import type * as rsvps from "../rsvps.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  rsvpInternal: typeof rsvpInternal;
  rsvpModel: typeof rsvpModel;
  rsvpRateLimits: typeof rsvpRateLimits;
  rsvpSecurity: typeof rsvpSecurity;
  rsvpTest: typeof rsvpTest;
  rsvps: typeof rsvps;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
