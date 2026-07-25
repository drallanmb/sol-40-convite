/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAccessLinkActions from "../adminAccessLinkActions.js";
import type * as adminAccessLinks from "../adminAccessLinks.js";
import type * as adminAccountModel from "../adminAccountModel.js";
import type * as adminAuditModel from "../adminAuditModel.js";
import type * as adminAuth from "../adminAuth.js";
import type * as adminAuthActions from "../adminAuthActions.js";
import type * as adminBootstrap from "../adminBootstrap.js";
import type * as adminInternal from "../adminInternal.js";
import type * as adminModel from "../adminModel.js";
import type * as adminOverview from "../adminOverview.js";
import type * as adminPassword from "../adminPassword.js";
import type * as adminPasswordActions from "../adminPasswordActions.js";
import type * as adminPosts from "../adminPosts.js";
import type * as adminRateLimits from "../adminRateLimits.js";
import type * as adminRsvps from "../adminRsvps.js";
import type * as adminSecurity from "../adminSecurity.js";
import type * as adminTest from "../adminTest.js";
import type * as adminWines from "../adminWines.js";
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
import type * as wineOperations from "../wineOperations.js";
import type * as wineTest from "../wineTest.js";
import type * as wines from "../wines.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAccessLinkActions: typeof adminAccessLinkActions;
  adminAccessLinks: typeof adminAccessLinks;
  adminAccountModel: typeof adminAccountModel;
  adminAuditModel: typeof adminAuditModel;
  adminAuth: typeof adminAuth;
  adminAuthActions: typeof adminAuthActions;
  adminBootstrap: typeof adminBootstrap;
  adminInternal: typeof adminInternal;
  adminModel: typeof adminModel;
  adminOverview: typeof adminOverview;
  adminPassword: typeof adminPassword;
  adminPasswordActions: typeof adminPasswordActions;
  adminPosts: typeof adminPosts;
  adminRateLimits: typeof adminRateLimits;
  adminRsvps: typeof adminRsvps;
  adminSecurity: typeof adminSecurity;
  adminTest: typeof adminTest;
  adminWines: typeof adminWines;
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
  wineOperations: typeof wineOperations;
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
