import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/signup.dto';
import { UpdateDto } from './dto/update.dto';
import { User } from './schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  async signUp(
    @Body() signUpDto: SignUpDto,
  ): Promise<{ accessToken: string; user: User }> {
    return this.authService.signUp(signUpDto);
  }

  @Get('/login')
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: User }> {
    return this.authService.login(loginDto);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: UpdateDto,
  ): Promise<User> {
    const updatedUser = await this.authService.updateUser(id, updateDto);
    return updatedUser;
  }
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    const deletedUser = await this.authService.deleteUser(id);
    return deletedUser;
  }
}
