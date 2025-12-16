import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'ASID87YADD7YASYHDSADHCSUYTGTSYCDTASDUASOIPDU76S5D', 
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, username: payload.username, displayName: payload.displayName };
  }
}