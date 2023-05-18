import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateDto } from './dto/update.dto';
import { r } from 'rethinkdb-ts';
import { RConnectionOptions } from 'rethinkdb-ts/lib/types';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

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

      let user: User | null = null;
      const userCursor = await r
        .table('users')
        .filter({ email })
        .run(connection);

      for await (const row of userCursor) {
        user = row;
        break;
      }

      if (user) {
        throw new NotFoundException('Email already exists');
      }

      const insertedUser = await r
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

      const userId = insertedUser.generated_keys[0];
      const createdUser = await r.table('users').get(userId).run(connection);

      await connection.close();

      const accessToken = this.jwtService.sign({ id: userId });

      return { accessToken, user: createdUser };
    } catch (error) {
      throw error;
    }
  }

  async updateUser(id: string, updateDto: UpdateDto): Promise<User> {
    const connectionOptions: RConnectionOptions = {
      host: 'localhost',
      port: 28015,
      db: 'user',
    };

    const connection = await r.connect(connectionOptions);

    try {
      console.log('Update ID>>>', id);
      console.log('Update DTO>>>>>', updateDto);
      const updatedUser = await r
        .table('users')
        .filter({ id: id })
        .update(updateDto)
        .run(connection);

      console.log('Updated User>>>>', updatedUser);
      if (updatedUser.replaced === 0) {
        throw new NotFoundException('User not found');
      }

      const user = await r.table('users').get(id).run(connection);
      console.log('Response>>>>', user);
      return user;
    } finally {
      await connection.close();
    }
  }

  async deleteUser(id: string) {
    const connectionOptions: RConnectionOptions = {
      host: 'localhost',
      port: 28015,
      db: 'user',
    };

    const connection = await r.connect(connectionOptions);

    try {
      console.log('Delete ID>>>', id);
      const deletedUser = await r
        .table('users')
        .filter({ id: id })
        .delete()
        .run(connection);

      console.log('Deleted User>>>>', deletedUser);
      if (deletedUser.deleted === 0) {
        throw new NotFoundException('User not found');
      }
    } finally {
      await connection.close();
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

      const accessToken = this.jwtService.sign({ id: user['userId'] });

      return { accessToken, user };
    } finally {
      await connection.close();
    }
  }
}
