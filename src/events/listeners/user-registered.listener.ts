import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRegisteredEvent } from '../user-events.service';

//event listners -> will respond to the event that is emitted by the eventemitter
@Injectable()
export class UserRegisteredListner {
  private readonly logger = new Logger(UserRegisteredListner.name);

  @OnEvent('user.registered')
  handleUserRegisteredEvent(event: UserRegisteredEvent): void {
    const { timeStamp, user } = event;

    //Real app -> you will mainly do action here
    //send email or verify email or send notification etc.
    this.logger.log(`Welcome ${user.email}! Your account created at ${timeStamp.toISOString()}`);
  }
}
