import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(input: { email: string; name: string; password: string }) {
    const hash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash: hash },
    });
    return this.signTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      throw new UnauthorizedException('Invalid credentials');
    return this.signTokens(user);
  }

  private async signTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as
        | `${number}${'s' | 'm' | 'h' | 'd'}`
        | number,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d') as
        | `${number}${'s' | 'm' | 'h' | 'd'}`
        | number,
    });

    return { accessToken, refreshToken };
  }

  async refresh(userId: string | number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId as any },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.signTokens(user);
  }
}
