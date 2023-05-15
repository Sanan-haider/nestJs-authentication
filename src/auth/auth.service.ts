import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(
    signUpDto: SignUpDto,
  ): Promise<{ accessToken: string; user: User }> {
    const { firstname, lastname, email, password, role } = signUpDto;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await this.userModel.create({
        firstname,
        lastname,
        email,
        role,
        password: hashedPassword,
      });

      const accessToken = this.jwtService.sign({ id: user._id });

      return { accessToken, user: user };
    } catch (error) {
      if (error.code === 11000) {
        throw new UnauthorizedException('Email already exists');
      }

      throw error;
    }
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: User }> {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.jwtService.sign({ id: user._id });

    return { accessToken, user: user };
  }
}
