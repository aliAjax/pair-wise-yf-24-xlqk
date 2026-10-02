import { localRepository } from "../utils/localRepository";
import { mockData } from "../mocks/seedData";
import { ControllerError } from "../utils/errors";
import { type CollectionName } from "../utils/storageKeys";
import { createReviewNote, editReviewNote, updateReviewNoteStatus } from "../services/reviewNoteService";
import type { ReviewNote } from "../types/ReviewNote";

const collection: CollectionName = "reviewNote";

export async function listReviewNote(): Promise<ReviewNote[]> {
  try {
    localRepository.init(mockData as unknown as Record<CollectionName, unknown[]>);
    return localRepository.list<ReviewNote>(collection);
  } catch (error) {
    throw new ControllerError("listReviewNote", error);
  }
}

export async function saveReviewNote(payload: ReviewNote): Promise<ReviewNote> {
  try {
    return localRepository.save(collection, payload).record;
  } catch (error) {
    throw new ControllerError("saveReviewNote", error);
  }
}

export async function createNote(params: {
  diff_result_id: number;
  tag: string;
  comment: string;
  reviewer: string;
}): Promise<ReviewNote> {
  try {
    return createReviewNote(params);
  } catch (error) {
    throw new ControllerError("createNote", error);
  }
}

export async function setNoteStatus(id: number, status: ReviewNote["status"]): Promise<ReviewNote> {
  try {
    return updateReviewNoteStatus(id, status);
  } catch (error) {
    throw new ControllerError("setNoteStatus", error);
  }
}

export async function editNote(id: number, comment: string): Promise<ReviewNote> {
  try {
    return editReviewNote(id, comment);
  } catch (error) {
    throw new ControllerError("editNote", error);
  }
}
