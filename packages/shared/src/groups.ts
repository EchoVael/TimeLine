import { z } from "zod";

export const idSchema = z.string().min(1);
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const groupSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  color: colorSchema,
  description: z.string().max(2_000),
  sortOrder: z.number().int().nonnegative(),
  archivedAt: z.string().datetime().nullable(),
  version: z.number().int().positive(),
});

export const createGroupRequestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: colorSchema,
  description: z.string().max(2_000).optional(),
});

export const updateGroupRequestSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    name: z.string().trim().min(1).max(80).optional(),
    color: colorSchema.optional(),
    description: z.string().max(2_000).optional(),
  })
  .refine(
    ({ color, description, name }) =>
      color !== undefined || description !== undefined || name !== undefined,
    "At least one group field must change",
  );

export const reorderGroupsRequestSchema = z.object({
  orderedIds: z.array(idSchema).min(1),
  expectedVersions: z.record(idSchema, z.number().int().positive()),
});

export type Group = z.infer<typeof groupSchema>;
export type CreateGroupRequest = z.infer<typeof createGroupRequestSchema>;
export type UpdateGroupRequest = z.infer<typeof updateGroupRequestSchema>;
export type ReorderGroupsRequest = z.infer<typeof reorderGroupsRequestSchema>;
