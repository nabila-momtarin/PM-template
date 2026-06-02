import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { User, UserDocument } from 'src/modules/user/entities/user.schema';
import { Role, RoleDocument } from 'src/modules/role/entities/role.schema';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    const userCount = await this.userModel.countDocuments({ isDeleted: false });

    if (userCount > 0) {
      this.logger.log('=\n\n\n=============================\n\n\n');
      this.logger.log('Seed skipped — users already exist');
      return;
    }


    this.logger.log('\n\n\nNo users found — seeding Super Admin...\n\n\n');

    // 1. Create Super Admin role
    let superAdminRole = await this.roleModel.findOne({ isSuperAdmin: true });

    if (!superAdminRole) {
      superAdminRole = await this.roleModel.create({
        roleName: 'Super Admin',
        isSuperAdmin: true,
        permissions: [],
      });
      this.logger.log(`Super Admin role created: ${superAdminRole._id}`);
    }

    // 2. Create Super Admin user
    const hashedPassword = await argon2.hash('Admin@1234');

    const superAdmin = await this.userModel.create({
      name: 'Super Admin',
      email: 'admin@company.com',
      password: hashedPassword,
      role: superAdminRole._id,
      isDeleted: false,
    });

    this.logger.log(`Super Admin user created: ${superAdmin.email}`);
    this.logger.log('==============================');
    this.logger.log('Super Admin credentials:');
    this.logger.log('Email:    admin@company.com');
    this.logger.log('Password: Admin@1234');
    this.logger.log('==============================');
  }
}
