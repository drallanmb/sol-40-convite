/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as postImageDecoder from "../postImageDecoder.js";
import type * as postImageDecoderLib from "../postImageDecoderLib.js";
import type * as postInternal from "../postInternal.js";
import type * as postModel from "../postModel.js";
import type * as postRateLimits from "../postRateLimits.js";
import type * as postSecurity from "../postSecurity.js";
import type * as postTest from "../postTest.js";
import type * as posts from "../posts.js";
import type * as rsvpInternal from "../rsvpInternal.js";
import type * as rsvpModel from "../rsvpModel.js";
import type * as rsvpRateLimits from "../rsvpRateLimits.js";
import type * as rsvpSecurity from "../rsvpSecurity.js";
import type * as rsvpTest from "../rsvpTest.js";
import type * as rsvps from "../rsvps.js";
import type * as uploadValidation from "../uploadValidation.js";
import type * as wineCatalog from "../wineCatalog.js";
import type * as wineInternal from "../wineInternal.js";
import type * as wineModel from "../wineModel.js";
import type * as wineTest from "../wineTest.js";
import type * as wines from "../wines.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  postImageDecoder: typeof postImageDecoder;
  postImageDecoderLib: typeof postImageDecoderLib;
  postInternal: typeof postInternal;
  postModel: typeof postModel;
  postRateLimits: typeof postRateLimits;
  postSecurity: typeof postSecurity;
  postTest: typeof postTest;
  posts: typeof posts;
  rsvpInternal: typeof rsvpInternal;
  rsvpModel: typeof rsvpModel;
  rsvpRateLimits: typeof rsvpRateLimits;
  rsvpSecurity: typeof rsvpSecurity;
  rsvpTest: typeof rsvpTest;
  rsvps: typeof rsvps;
  uploadValidation: typeof uploadValidation;
  wineCatalog: typeof wineCatalog;
  wineInternal: typeof wineInternal;
  wineModel: typeof wineModel;
  wineTest: typeof wineTest;
  wines: typeof wines;
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
