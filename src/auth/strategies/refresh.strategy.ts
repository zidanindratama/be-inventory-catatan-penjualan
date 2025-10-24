import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';

function extractRefresh(req: Request) {
  const token = req.cookies?.refresh_token || req.header('x-refresh-token');
  return token || null;
}

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: extractRefresh,
      secretOrKey: process.env.JWT_REFRESH_SECRET,
      passReqToCallback: true,
    });
  }
  validate(req: Request, payload: any) {
    return { ...payload, refreshToken: extractRefresh(req) };
  }
}
