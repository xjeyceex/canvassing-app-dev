/**
 * @type {readonly string[]}
 * @description Routes accessible without authentication.
 */
export const publicRoutes = ["/"] as const;

/**
 * @type {readonly string[]}
 * @description Authentication-related routes.
 */
export const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
] as const;

/**
 * @type {readonly string[]}
 * @description Routes that require authentication.
 */
export const protectedRoutes = [
  "/dashboard",
  "/tickets",
  "/profile",
  "/notifications",
  "/users",
] as const;

/**
 * @constant {string}
 * @description Main entry point for protected pages.
 */
export const dashboardRoute = "/dashboard" as const;
