import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from './entities/user.entity';
import { Response } from 'express';
import { UserEventsService } from 'src/events/user-events.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userEventService: UserEventsService,
  ) {}

  register(registerDto: RegisterDto) {
    return this.createUser(registerDto, UserRole.USER, 'User registered successfully');
  }

  createAdmin(registerDto: RegisterDto) {
    return this.createUser(registerDto, UserRole.ADMIN, 'Admin registered successfully');
  }

  async login(loginDto: LoginDto, res: Response) {
    const user = await this.userRepository.findOne({ where: { email: loginDto.email } });

    if (!user) {
      throw new ConflictException('User not found');
    }

    if (!(await this.verifyPassword(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid password');
    }

    const tokens = this.generateTokens(user);
    const hashedRefresh = await this.hashData(tokens.refreshToken);
    await this.userRepository.update({ id: user.id }, { hashedRefreshToken: hashedRefresh });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: this.configService.get<number>('JWT_REFRESH_MAX_AGE') || 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: this.configService.get<number>('JWT_MAX_AGE') || 15 * 60 * 1000,
    });

    const { password, hashedRefreshToken, ...result } = user;

    return { user: result, accessToken: tokens.accessToken };
  }

  async refreshToken(userId: number, refreshToken: string, res: Response) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Refresh token Expired!!!');
    }

    const isMatch = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid refresh token!!!');
    }

    const newTokens = this.generateTokens(user);
    const hashedNewRefresh = await this.hashData(newTokens.refreshToken);
    await this.userRepository.update({ id: user.id }, { hashedRefreshToken: hashedNewRefresh });

    res.cookie('refreshToken', newTokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: this.configService.get<number>('JWT_REFRESH_MAX_AGE') || 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('accessToken', newTokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: this.configService.get<number>('JWT_MAX_AGE') || 15 * 60 * 1000,
    });

    return { accessToken: newTokens.accessToken };
  }

  async getUserById(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found!');
    }

    const { password, hashedRefreshToken, ...result } = user;
    return result;
  }

  async logout(userId: number, res: Response) {
    await this.userRepository.update(userId, { hashedRefreshToken: null });

    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');

    return { message: 'Logged out successfully' };
  }

  private async createUser(registerDto: RegisterDto, role: UserRole, successMsg: string) {
    const existingUser = await this.userRepository.findOneBy({ email: registerDto.email });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await this.hashData(registerDto.password);

    const newUser = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      role,
    });

    const savedUser = await this.userRepository.save(newUser);

    // Emit the user registered event
    this.userEventService.emitUserRegistered(newUser);

    const { password, hashedRefreshToken, ...result } = savedUser;
    return { user: result, message: successMsg };
  }

  private hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  private verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  private generateTokens(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  private generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });
  }
}
