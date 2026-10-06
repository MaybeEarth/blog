import { Controller, Get, Patch, Param, Body, UsePipes } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Role } from '@prisma/client';
import { updateUserProfileSchema, UpdateUserProfileInput, JwtPayload } from '@blog/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  async findById(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.usersService.findById(id, actor);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserProfileSchema)) dto: UpdateUserProfileInput,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.update(id, dto, actor);
  }
}
