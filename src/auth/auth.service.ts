import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { r } from 'rethinkdb-ts';

import { RConnectionOptions } from 'rethinkdb-ts';

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

      const connectionOptions: RConnectionOptions = {
        host: 'localhost',
        port: 28015,
        db: 'user',
      };

      const connection = await r.connect(connectionOptions);

      const user = await r
        .table('users')
        .insert({
          firstname,
          lastname,
          email,
          role,
          password: hashedPassword,
          createdAt: r.now(),
          updatedAt: r.now(),
        })
        .run(connection);

      const userId = user.generated_keys[0];
      const createdUser = await r.table('users').get(userId).run(connection);

      await connection.close();

      const accessToken = this.jwtService.sign({ id: userId });

      return { accessToken, user: createdUser };
    } catch (error) {
      if (error.code === 11000) {
        throw new NotFoundException('Email already exists');
      }

      throw error;
    }
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; user: User }> {
    const { email, password } = loginDto;
    const connectionOptions: RConnectionOptions = {
      host: 'localhost',
      port: 28015,
      db: 'user',
    };

    const connection = await r.connect(connectionOptions);

    try {
      const userCursor = await r
        .table('users')
        .filter({ email })
        .run(connection);
      let user: User | null = null;

      for await (const row of userCursor) {
        user = row;
        break;
      }

      if (!user || !user.password) {
        throw new NotFoundException('Invalid email or password');
      }

      const isPasswordMatched = await bcrypt.compare(password, user.password);

      if (!isPasswordMatched) {
        throw new NotFoundException('Invalid email or password');
      }

      const accessToken = this.jwtService.sign({ id: user._id });

      return { accessToken, user };
    } finally {
      await connection.close();
    }
  }
}
