import { localRepository } from "../utils/localRepository";
import { AppError, ServiceError } from "../utils/errors";
import { createDefaultReviewNote } from "../constructors/ReviewNoteConstructor";
import type { ReviewNote } from "../types/ReviewNote";
import { ERROR_CODES } from "../constants/errorCodes";
import { renderLog } from "../constants/logTemplates";

/** 新建审阅备注；原文同时写入 comment 与 original_comment */
export function createReviewNote(params: {
  diff_result_id: number;
  tag: string;
  comment: string;
  reviewer: string;
}): ReviewNote {
  try {
    if (!params.comment.trim()) throw new AppError(ERROR_CODES.VALIDATION_FAILED, "备注内容不能为空");
    const now = new Date().toISOString();
    const note = createDefaultReviewNote({
      id: localRepository.nextId("reviewNote"),
      diff_result_id: params.diff_result_id,
      tag: params.tag,
      comment: params.comment,
      original_comment: params.comment,
      reviewer: params.reviewer || "未署名",
      status: "OPEN",
      recheck_at: ""
    });
    localRepository.save("reviewNote", note, { documentId: undefined });
    console.info(renderLog("ReviewNote", 0, { stable_key: note.diff_result_id, tag: note.tag, reviewer: note.reviewer }));
    return note;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ServiceError("BATCH_SAVE_FAILED", { batch: 1, total: 1, reason: String(error) }, error);
  }
}

/**
 * 更新备注状态。
 * 待复核备注被人工确认时：状态转 CONFIRMED，comment 仍是原始原文，复核时间清空。
 */
export function updateReviewNoteStatus(id: number, status: ReviewNote["status"]): ReviewNote {
  const note = localRepository.find<ReviewNote>("reviewNote", id);
  if (!note) throw new AppError(ERROR_CODES.VALIDATION_FAILED, `备注不存在：${id}`);
  const from = note.status;
  const updated: ReviewNote = {
    ...note,
    status,
    original_comment: note.original_comment || note.comment,
    comment: note.original_comment || note.comment,
    recheck_at: status === "RECHECK" ? note.recheck_at || new Date().toISOString() : ""
  };
  localRepository.save("reviewNote", updated);
  console.info(renderLog("ReviewNote", 1, { stable_key: note.diff_result_id, from, to: status }));
  return updated;
}

/** 追加编辑备注：原文仍保留在 original_comment，仅修改当前 comment */
export function editReviewNote(id: number, comment: string): ReviewNote {
  const note = localRepository.find<ReviewNote>("reviewNote", id);
  if (!note) throw new AppError(ERROR_CODES.VALIDATION_FAILED, `备注不存在：${id}`);
  const updated: ReviewNote = { ...note, comment };
  localRepository.save("reviewNote", updated);
  return updated;
}
