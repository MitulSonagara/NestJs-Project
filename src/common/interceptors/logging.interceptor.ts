import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = req;
    const userAgent = req.get('user-agent') || 'unknown';
    const userId = req?.user?.id ?? 'unauthenticated';

    this.logger.log(`Incoming request: ${method} ${url} | User: ${userId} | Agent: ${userAgent}`);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const duration = Date.now() - startTime;
          let responseSize = 0;

          try {
            responseSize = Buffer.byteLength(JSON.stringify(responseData) || '', 'utf8');
          } catch {
            responseSize = -1; // fallback if serialization fails
          }

          this.logger.log(
            `Response: ${method} ${url} | Duration: ${duration}ms | Size: ${responseSize >= 0 ? responseSize + ' bytes' : 'unknown'}`,
          );
        },

        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error(
            `Error: ${method} ${url} | Duration: ${duration}ms | Message: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
