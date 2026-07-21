// src/common/interceptors/logging.interceptor.ts

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap } from 'rxjs/operators';
import type { AuthenticatedUser } from '@/auth/auth.types';

type RequestWithUser = Request & { user?: AuthenticatedUser };

/** Logs one line per request: method, path, status, duration, and the acting user (if any). */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    // GraphQL resolvers go through this same global interceptor, but there's
    // no per-field HTTP request/response to log against — only the whole
    // /graphql POST, which Express's own layer isn't reachable from here.
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { method, originalUrl } = request;
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => this.logResult(context, method, originalUrl, startedAt),
        error: (error: Error) =>
          this.logResult(context, method, originalUrl, startedAt, error),
      }),
    );
  }

  private logResult(
    context: ExecutionContext,
    method: string,
    url: string,
    startedAt: bigint,
    error?: Error & { status?: number },
  ): void {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const statusCode = error ? (error.status ?? 500) : response.statusCode;
    const actor = request.user?.id ?? 'anonymous';
    const message = `${method} ${url} ${statusCode} ${durationMs.toFixed(1)}ms user=${actor}`;

    if (statusCode >= 500) {
      this.logger.error(message, error?.stack);
    } else if (statusCode >= 400) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }
  }
}
