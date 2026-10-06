import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { loginSchema, LoginInput } from '@blog/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() dto: LoginInput,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const ip = req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(dto, ip, userAgent);

    this.setRefreshTokenCookie(reply, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const cookieToken = req.cookies?.['refreshToken'];
    const token = cookieToken || bodyToken;
    const ip = req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.refresh(token!, ip, userAgent);

    this.setRefreshTokenCookie(reply, result.refreshToken);

    return {
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const cookieToken = req.cookies?.['refreshToken'];
    const token = cookieToken || bodyToken;

    await this.authService.logout(token);

    reply.clearCookie('refreshToken', {
      path: '/api/v1/auth',
    });

    return { success: true };
  }

  @Get('me')
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }

  private setRefreshTokenCookie(reply: FastifyReply, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    reply.setCookie('refreshToken', token, {
      path: '/api/v1/auth',
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 gün (saniye)
    });
  }
}
