import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

//protect routes that requires authentication -> Protected routes

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('No access token provided. Please login.');
      }
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token has expired. Please login again.');
      }
      throw new UnauthorizedException('Invalid access token.');
    }
    return user;
  }
}

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  handleRequest(err: any, user: any, info: any, context: any) {
    if (err || !user) {
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('No refresh token provided.');
      }
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired. Please login again.');
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }
    return user;
  }
}
