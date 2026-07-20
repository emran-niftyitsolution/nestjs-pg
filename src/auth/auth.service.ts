// src/auth/auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify as argon2Verify } from 'argon2';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { SafeUser, UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: CreateUserDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(dto);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string): Promise<SafeUser> {
    return this.usersService.findOne(userId);
  }

  private async validateUser(
    email: string,
    password: string,
  ): Promise<SafeUser> {
    const user = await this.usersService.findByEmail(email);
    const passwordMatches =
      !!user && (await argon2Verify(user.password, password));

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private buildAuthResponse(user: SafeUser): AuthResponseDto {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
