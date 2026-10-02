import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes";
import { renderErrorMessage, type ErrorMessageKey } from "../constants/errorMessages";
import type { CollectionName } from "./storageKeys";

/** 最底层存储/领域错误 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }

  toUserMessage(): string {
    return this.message;
  }
}

/** 版本冲突：晚到的保存被拒，payload 必须由调用方存入冲突草稿 */
export class VersionConflictError<T = unknown> extends AppError {
  readonly collection: CollectionName;
  readonly recordId: number;
  readonly documentId: number;
  readonly baseRevision: number;
  readonly currentRevision: number;
  readonly payload: T;

  constructor(params: {
    collection: CollectionName;
    recordId: number;
    documentId: number;
    baseRevision: number;
    currentRevision: number;
    payload: T;
  }) {
    super(
      ERROR_CODES.VERSION_CONFLICT,
      renderErrorMessage("VERSION_CONFLICT", { base: params.baseRevision, current: params.currentRevision }),
      undefined
    );
    this.name = "VersionConflictError";
    this.collection = params.collection;
    this.recordId = params.recordId;
    this.documentId = params.documentId;
    this.baseRevision = params.baseRevision;
    this.currentRevision = params.currentRevision;
    this.payload = params.payload;
  }
}

/** service 层包装：禁止把底层异常直接抛给 controller */
export class ServiceError extends AppError {
  constructor(messageKey: ErrorMessageKey, params: Record<string, string | number>, cause?: unknown) {
    super(ERROR_CODES.BATCH_SAVE_FAILED, renderErrorMessage(messageKey, params), cause);
    this.name = "ServiceError";
  }
}

/** controller（api）层包装：禁止 service 异常直接透出页面 */
export class ControllerError extends AppError {
  readonly action: string;

  constructor(action: string, cause: unknown) {
    const inner = cause instanceof AppError ? cause.message : "本地数据操作失败";
    super(cause instanceof AppError ? cause.code : ERROR_CODES.VALIDATION_FAILED, `[${action}] ${inner}`, cause);
    this.name = "ControllerError";
    this.action = action;
  }
}
