import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from 'src/users/dto/create-user-dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async register(createUserDto: CreateUserDto) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const userToCreate = {
      ...createUserDto,
      password: hashedPassword, 
    };

    return this.usersService.create(userToCreate);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOne(loginDto.username);

    if (user && (await bcrypt.compare(loginDto.password, user.password))) {
      
      const payload = { 
        username: user.username, 
        sub: user._id, 
        displayName: user.displayName 
      };

      return {
        access_token: this.jwtService.sign(payload), 
        user: { 
          id: user._id,
          username: user.username,
          displayName: user.displayName
        }
      };
    }

    throw new UnauthorizedException('Credenciais inválidas');
  }
}