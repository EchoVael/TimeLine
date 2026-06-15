import type {
  CreateGroupRequest,
  Group,
  ReorderGroupsRequest,
  UpdateGroupRequest,
} from "@timemagic/shared";

import { ApiError } from "../lib/api-error.js";
import { createId } from "../lib/id.js";
import {
  GroupRepository,
  type GroupRecord,
} from "./group.repository.js";

function toGroup(record: GroupRecord): Group {
  return {
    archivedAt: record.archivedAt,
    color: record.color,
    description: record.description,
    id: record.id,
    name: record.name,
    sortOrder: record.sortOrder,
    version: record.version,
  };
}

export class GroupService {
  constructor(private readonly repository: GroupRepository) {}

  list(includeArchived = false): Group[] {
    return this.repository.list(includeArchived).map(toGroup);
  }

  create(input: CreateGroupRequest): Group {
    const now = new Date().toISOString();
    const sortOrder = this.repository.list(false).length;

    return toGroup(
      this.repository.insert({
        archivedAt: null,
        color: input.color.toLowerCase(),
        createdAt: now,
        deletedAt: null,
        description: input.description ?? "",
        id: createId(),
        name: input.name.trim(),
        sortOrder,
        trashBatchId: null,
        updatedAt: now,
        version: 1,
      }),
    );
  }

  update(id: string, input: UpdateGroupRequest): Group {
    const updated = this.repository.update(
      id,
      input.expectedVersion,
      {
        color: input.color?.toLowerCase(),
        description: input.description,
        name: input.name?.trim(),
      },
      new Date().toISOString(),
    );

    if (updated) {
      return toGroup(updated);
    }

    this.throwMissingOrConflict(id);
  }

  reorder(input: ReorderGroupsRequest): Group[] {
    const current = this.repository.list(false);
    const currentIds = current.map(({ id }) => id);

    if (
      currentIds.length !== input.orderedIds.length ||
      new Set(input.orderedIds).size !== input.orderedIds.length ||
      currentIds.some((id) => !input.orderedIds.includes(id))
    ) {
      throw new ApiError(
        422,
        "VALIDATION_FAILED",
        "groups.order.membership",
      );
    }

    for (const group of current) {
      if (input.expectedVersions[group.id] !== group.version) {
        throw new ApiError(409, "VERSION_CONFLICT", "groups.version", {
          current: toGroup(group),
        });
      }
    }

    try {
      return this.repository
        .reorder(
          input.orderedIds,
          input.expectedVersions,
          new Date().toISOString(),
        )
        .map(toGroup);
    } catch (error) {
      if (error instanceof Error && error.message === "VERSION_CONFLICT") {
        throw new ApiError(409, "VERSION_CONFLICT", "groups.version");
      }
      throw error;
    }
  }

  setArchived(id: string, expectedVersion: number, archived: boolean): Group {
    const updated = this.repository.update(
      id,
      expectedVersion,
      { archivedAt: archived ? new Date().toISOString() : null },
      new Date().toISOString(),
    );

    if (updated) {
      return toGroup(updated);
    }

    this.throwMissingOrConflict(id);
  }

  private throwMissingOrConflict(id: string): never {
    const current = this.repository.findById(id);
    if (!current) {
      throw new ApiError(404, "NOT_FOUND", "groups.notFound");
    }

    throw new ApiError(409, "VERSION_CONFLICT", "groups.version", {
      current: toGroup(current),
    });
  }
}
