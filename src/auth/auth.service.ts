import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  register(registerDto: RegisterDto) {
    return this.createUser(registerDto, UserRole.USER, 'User registered successfully');
  }

  createAdmin(registerDto: RegisterDto) {
    return this.createUser(registerDto, UserRole.ADMIN, 'Admin registered successfully');
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: loginDto.email } });
    if (!user) {
      throw new ConflictException('User not found');
    }
    if (!(await this.verifyPassword(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid password');
    }
    const tokens = this.generateTokens(user);
    const { password, ...result } = user;
    return { user: result, ...tokens };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: 'thisisrefreshsecret' });
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }
      const accessToken = this.generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async createUser(registerDto: RegisterDto, role: UserRole, successMsg: string) {
    const existingUser = await this.userRepository.findOneBy({ email: registerDto.email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    const hashedPassword = await this.hashPassword(registerDto.password);
    const newUser = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      role,
    });
    const savedUser = await this.userRepository.save(newUser);
    const { password, ...result } = savedUser;
    return { user: result, message: successMsg };
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
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
    return this.jwtService.sign(payload, { secret: 'thisisjwtsecret', expiresIn: '15m' });
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
    };
    return this.jwtService.sign(payload, { secret: 'thisisrefreshsecret', expiresIn: '7d' });
  }
}
