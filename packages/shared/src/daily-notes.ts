import { z } from "zod";

import { localDateSchema } from "./dates.js";
import { idSchema } from "./groups.js";
import { milestoneSchema } from "./milestones.js";

export const frontmatterConflictSchema = z.object({
  code: z.enum(["INVALID_RESERVED_FIELD", "IDENTITY_MISMATCH"]),
  messageKey: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      reason: z.string(),
      fileValue: z.unknown(),
      databaseValue: z.unknown(),
    }),
  ),
});

export const documentPayloadSchema = z.object({
  id: idSchema,
  kind: z.enum(["milestone", "daily"]),
  markdown: z.string(),
  revision: z.string(),
  modifiedAt: z.string().datetime(),
  conflict: frontmatterConflictSchema.nullable(),
});

export const newDailyDocumentDraftSchema = z.object({
  id: z.null(),
  kind: z.literal("daily"),
  markdown: z.string(),
  revision: z.null(),
  modifiedAt: z.null(),
  conflict: z.null(),
});

export const dailyNoteSummarySchema = z.object({
  date: localDateSchema,
  exists: z.boolean(),
  documentId: idSchema.nullable(),
  groupIds: z.array(idSchema),
  recycledGroupIds: z.array(idSchema),
  dueMilestones: z.array(milestoneSchema),
  version: z.number().int().positive().nullable(),
});

export const saveDailyDocumentRequestSchema = z.object({
  markdown: z.string(),
  expectedRevision: z.string().nullable(),
  conflictStrategy: z.enum(["overwrite"]).optional(),
});

export const updateDailyNoteGroupsRequestSchema = z
  .object({
    expectedVersion: z.number().int().positive().nullable(),
    addGroupIds: z.array(idSchema),
    removeGroupIds: z.array(idSchema),
  })
  .refine(
    ({ addGroupIds, removeGroupIds }) =>
      addGroupIds.length > 0 || removeGroupIds.length > 0,
    "At least one group association must change",
  );

export type DocumentPayload = z.infer<typeof documentPayloadSchema>;
export type NewDailyDocumentDraft = z.infer<
  typeof newDailyDocumentDraftSchema
>;
export type DailyNoteSummary = z.infer<typeof dailyNoteSummarySchema>;
export type SaveDailyDocumentRequest = z.infer<
  typeof saveDailyDocumentRequestSchema
>;
export type UpdateDailyNoteGroupsRequest = z.infer<
  typeof updateDailyNoteGroupsRequestSchema
>;
