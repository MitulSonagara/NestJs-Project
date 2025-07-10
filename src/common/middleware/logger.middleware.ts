import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || 'unknown';

    const startTime = Date.now();

    this.logger.log(`[Incoming] ${method} ${originalUrl} | IP: ${ip} | Agent: ${userAgent}`);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const message = `[Response] ${method} ${originalUrl} | Status: ${statusCode} | Duration: ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
