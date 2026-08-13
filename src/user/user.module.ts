import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ProfileImageService } from './profile-image.service';
import { StorageModule } from '@/common/storage/storage.module';

@Module({
  imports: [AuthModule, PrismaModule, StorageModule],
  controllers: [UserController],
  providers: [UserService, ProfileImageService],
})
export class UserModule {}
