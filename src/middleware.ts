import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// Pathname prefixes to ignore for middleware processing.
// These include Next.js internals and common static or API routes.
const IGNORE_PATHS = ["/_next", "/favicon.ico", "/.well-known", "/api", "/static"];
const ENABLE_DRAFT_MODE_ROUTE = "/api/preview";

export async function middleware(request: NextRequest) {
    const { searchParams, pathname } = request.nextUrl;
    // Check if the preview/editing flag is set.
    const previewRequested =
        searchParams.get("wb.preview") === "true" || searchParams.get("wb.editing") === "true";

    // Skip processing for excluded paths to improve performance.
    const isExcluded = IGNORE_PATHS.some(path => pathname.startsWith(path));
    if (isExcluded) {
        return NextResponse.next();
    }

    // Retrieve the current draft mode state for this request.
    const previewMode = await draftMode();

    if (previewRequested) {
        // If preview mode is already enabled, disable caching on the response.
        // This ensures fresh content when in preview.
        if (previewMode.isEnabled) {
            const res = NextResponse.next();
            res.headers.set("X-Preview-Params", searchParams.toString());
            res.headers.set(
                "Cache-Control",
                "no-store, no-cache, must-revalidate, proxy-revalidate"
            );
            res.headers.set("Pragma", "no-cache");
            res.headers.set("Expires", "0");
            return res;
        }

        // If preview mode is not enabled yet, redirect to the preview API route
        // which will enable draft mode and set the necessary cookies.
        // Passes along all query parameters.
        const url = new URL(request.url);
        url.pathname = ENABLE_DRAFT_MODE_ROUTE;

        return NextResponse.redirect(url);
    } else if (!previewRequested && previewMode.isEnabled) {
        // If the preview query param is missing but draft mode is enabled,
        // disable draft mode to exit preview mode.
        previewMode.disable();

        // Redirect to the same URL to clear draft mode cookies properly.
        return NextResponse.redirect(request.url);
    }

    // For all other requests, continue as normal without any modifications.
    return NextResponse.next();
}
