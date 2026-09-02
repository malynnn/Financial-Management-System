import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users or filter by role' })
  @ApiQuery({ name: 'role', required: false, description: 'Role filter (MEMBER, TREASURER, AUDITOR, ADMIN)' })
  findAll(@Query('role') role?: string) {
    return this.usersService.findAll(role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile details with obligations and collections' })
  @ApiParam({ name: 'id', description: 'User ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post('auth/verify')
  @ApiOperation({ summary: 'Verify user login credentials' })
  async verifyCredentials(@Body() body: { email: string; password?: string }) {
    const user = await this.usersService.validateUserCredentials(body.email, body.password || '');
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }
}
