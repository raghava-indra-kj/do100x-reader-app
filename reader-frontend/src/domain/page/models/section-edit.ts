import { z } from 'zod';
import type { SectionBodyTarget } from '@reader/md-ast';

const RangeSchema = z.object({
    kind: z.enum(['heading', 'preamble']), headingStart: z.number().nullable(), headingEnd: z.number().nullable(),
    bodyStart: z.number(), bodyEnd: z.number(), level: z.number(), title: z.string().nullable(), rawHeading: z.string().nullable(),
});
export const SectionEditSnapshotSchema = z.object({
    contentVersion: z.number().int().nonnegative(),
    sections: z.array(z.object({
        range: RangeSchema,
        target: z.object({ kind: z.enum(['heading', 'preamble']), headingStart: z.number().nullable(), bodyStart: z.number(), expectedHeading: z.string().nullable(), expectedBody: z.string() }),
        expectedBodyHash: z.string(),
    })),
});
export type SectionEditSnapshot = z.infer<typeof SectionEditSnapshotSchema>;
export interface SectionEditParams {
    pageId: string;
    contentVersion: number;
    target: SectionBodyTarget;
    expectedBodyHash: string;
    newBody: string;
}
