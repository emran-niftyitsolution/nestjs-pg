// src/common/decorators/to-boolean.decorator.ts

import { Transform } from 'class-transformer';

/**
 * Query-string booleans arrive as the literal strings "true"/"false" — and
 * `@Type(() => Boolean)` is a trap here: it coerces with JS's `Boolean(...)`,
 * and `Boolean("false")` is `true` because any non-empty string is truthy.
 * `?isActive=false` would silently be read as `true`.
 *
 * Reading from `obj[key]` instead of `value` matters too: our global
 * ValidationPipe sets `enableImplicitConversion: true`, which runs its own
 * type-directed coercion (the same `Boolean("false") === true` trap) BEFORE
 * any `@Transform` callback sees `value` — by then the string is already
 * corrupted into `true`. `obj[key]` is the untouched raw input.
 */
export function ToBoolean() {
  return Transform(
    ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
      const raw = obj[key];
      if (typeof raw === 'boolean') {
        return raw;
      }
      if (typeof raw === 'string') {
        return raw.toLowerCase() === 'true';
      }
      return raw;
    },
  );
}
