import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from 'src/auth/entities/user.entity';

export interface UserRegisteredEvent {
  user: {
    id: number;
    email: string;
    name: string;
  };
  timeStamp: Date;
}

@Injectable()
export class UserEventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  //Emit an user registered event
  emitUserRegistered(user: User): void {
    const userRegisteredEventData: UserRegisteredEvent = {
      user: {
        email: user.email,
        name: user.name,
        id: user.id,
      },
      timeStamp: new Date(),
    };

    //event name and event data
    this.eventEmitter.emit('user.registered', userRegisteredEventData);
  }
}
