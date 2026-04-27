import { Injectable, Logger } from '@nestjs/common';
import { UserInfo, UserMutationEvent } from 'src/infrastructure/kafka/events';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async handleMutation(event: UserMutationEvent): Promise<void> {
    const { type, userInfo, serviceId } = event;

    switch (type) {
      case 'USER_CREATED':
        await this.onCreate(userInfo, serviceId);
        break;

      case 'USER_UPDATED':
        await this.onUpdate(userInfo, serviceId);
        break;

      case 'USER_DELETED':
        await this.onDelete(userInfo, serviceId);
        break;

      default:
        this.logger.warn(`Unknown user mutation type: ${type}`);
    }
  }

  private async onCreate(userInfo: UserInfo, serviceId: string): Promise<void> {
    await this.userRepository.createOne(userInfo as any);
    this.logger.log(`User created [uId=${userInfo.uId}, serviceId=${serviceId}]`);
  }

  private async onUpdate(userInfo: UserInfo, serviceId: string): Promise<void> {
    const { _id, id: idField, ...rest } = userInfo;
    const id = _id ?? idField;

    if (!id) {
      this.logger.warn(`USER_UPDATED missing id [serviceId=${serviceId}]`);
      return;
    }

    await this.userRepository.updateByID(id, { $set: rest });
    this.logger.log(`User updated [id=${id}, serviceId=${serviceId}]`);
  }

  private async onDelete(userInfo: UserInfo, serviceId: string): Promise<void> {
    // TODO: implement delete/soft-delete logic when required
    this.logger.log(`USER_DELETED received [uId=${userInfo.uId}, serviceId=${serviceId}] — no-op`);
  }
}
