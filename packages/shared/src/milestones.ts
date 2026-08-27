import { z } from "zod";

import { localDateSchema, type LocalDate } from "./dates.js";
import { idSchema } from "./groups.js";

export const milestoneStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
]);

export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export const milestoneSchema = z.object({
  id: idSchema,
  groupId: idSchema,
  title: z.string().trim().min(1).max(120),
  date: localDateSchema,
  status: milestoneStatusSchema,
  completedOn: localDateSchema.nullable(),
  dayOrder: z.number().int().nonnegative(),
  documentId: idSchema,
  overdue: z.boolean(),
  version: z.number().int().positive(),
});

export const createMilestoneRequestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  date: localDateSchema,
  groupId: idSchema,
});

export const updateMilestoneRequestSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    title: z.string().trim().min(1).max(120).optional(),
    date: localDateSchema.optional(),
    groupId: idSchema.optional(),
    status: milestoneStatusSchema.optional(),
    completedOn: localDateSchema.nullable().optional(),
  })
  .refine(
    ({ completedOn, date, groupId, status, title }) =>
      completedOn !== undefined ||
      date !== undefined ||
      groupId !== undefined ||
      status !== undefined ||
      title !== undefined,
    "At least one milestone field must change",
  );

export const deleteMilestoneRequestSchema = z.object({
  expectedVersion: z.number().int().positive(),
});

export const milestoneListQuerySchema = z.object({
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
  groupId: z.union([idSchema, z.array(idSchema)]).optional(),
  status: z
    .union([milestoneStatusSchema, z.array(milestoneStatusSchema)])
    .optional(),
  includePast: z.boolean().default(false),
  includeCompleted: z.boolean().default(false),
  includeCancelled: z.boolean().default(false),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const reorderMilestonesRequestSchema = z.object({
  date: localDateSchema,
  orderedIds: z.array(idSchema).min(1),
  expectedVersions: z.record(idSchema, z.number().int().positive()),
});

export function isOverdue(
  date: LocalDate,
  status: MilestoneStatus,
  today: LocalDate,
): boolean {
  return date < today && status !== "completed" && status !== "cancelled";
}

export type Milestone = z.infer<typeof milestoneSchema>;
export type CreateMilestoneRequest = z.infer<
  typeof createMilestoneRequestSchema
>;
export type UpdateMilestoneRequest = z.infer<
  typeof updateMilestoneRequestSchema
>;
export type DeleteMilestoneRequest = z.infer<
  typeof deleteMilestoneRequestSchema
>;
export type MilestoneListQuery = z.infer<typeof milestoneListQuerySchema>;
export type ReorderMilestonesRequest = z.infer<
  typeof reorderMilestonesRequestSchema
>;
