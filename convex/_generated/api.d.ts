/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accordions from "../accordions.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as nips from "../nips.js";
import type * as products from "../products.js";
import type * as profilePictures from "../profilePictures.js";
import type * as router from "../router.js";
import type * as settings from "../settings.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accordions: typeof accordions;
  admin: typeof admin;
  auth: typeof auth;
  dashboard: typeof dashboard;
  http: typeof http;
  nips: typeof nips;
  products: typeof products;
  profilePictures: typeof profilePictures;
  router: typeof router;
  settings: typeof settings;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
