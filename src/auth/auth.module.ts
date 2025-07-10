import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [
    // this will make the post repository available for injection
    // available in the current scope
    TypeOrmModule.forFeature([User]),

    // passport module
    PassportModule,

    //configure jwt
    JwtModule.register({}),
    EventsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
