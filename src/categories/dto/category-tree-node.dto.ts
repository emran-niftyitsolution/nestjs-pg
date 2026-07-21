// src/categories/dto/category-tree-node.dto.ts

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { categoryResponseSchema } from './category-response.dto';

export interface CategoryTreeNode
  extends z.infer<typeof categoryResponseSchema> {
  children: CategoryTreeNode[];
}

// Recursive schema: a category shape plus a self-referential `children`
// array. The explicit z.ZodType<CategoryTreeNode> annotation (rather than
// letting TS infer the .extend() return type) is what lets the `children`
// field reference `categoryTreeNodeSchema` before its own declaration
// finishes initializing — z.lazy() defers evaluation to first parse/use.
export const categoryTreeNodeSchema: z.ZodType<CategoryTreeNode> =
  categoryResponseSchema.extend({
    children: z.lazy(() => z.array(categoryTreeNodeSchema)),
  });

export class CategoryTreeNodeDto extends createZodDto(categoryTreeNodeSchema) {}
