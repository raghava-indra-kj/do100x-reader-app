import { ApiError } from "@core/errors/api-error";
import { StatusCodes } from "http-status-codes";
import { isValidUUID } from "@lib/uuid";
import { PageError } from "../errors/page-error";
import { PAGE_NOT_FOUND, INVALID_PAGE_ID } from "../errors/page-error.constants";

export function parsePageId(rawId: unknown): string | null {
    if (typeof rawId !== "string") return null;
    return isValidUUID(rawId) ? rawId : null;
}

export function requirePageId(rawId: unknown): string {
    const pageId = parsePageId(rawId);
    if (!pageId) {
        throw new PageError({
            errorCode: PAGE_NOT_FOUND,
            message: "Invalid page identifier",
        });
    }
    return pageId;
}

export function requirePageIdParam(rawId: unknown): string {
    const pageId = parsePageId(rawId);
    if (!pageId) {
        throw new ApiError({
            statusCode: StatusCodes.BAD_REQUEST,
            message: "Invalid page identifier",
            errorCode: INVALID_PAGE_ID,
        });
    }
    return pageId;
}
