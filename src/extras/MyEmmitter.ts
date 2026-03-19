
import {EventEmitter} from 'events';
import {IUser} from '../modules/users/extras/user_types';

type EventMap = Record<string, unknown>;

type EventKey<T extends EventMap> = string & keyof T;
type EventReceiver<T> = (params: {data: T, initiator?: IUser}) => void;

interface Emitter<T extends EventMap> {
  on<K extends EventKey<T>>
    (eventName: K, fn: EventReceiver<T[K]>): void;
  off<K extends EventKey<T>>
    (eventName: K, fn: EventReceiver<T[K]>): void;
  emit<K extends EventKey<T>>
    (eventName: K, params: { data: T[K]; initiator?: IUser}): void;
}

/**
 * Use this class for creating global events
 */
export class MyEmitter<T extends EventMap> implements Emitter<T> {
  private emitter = new EventEmitter();
  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.emitter.on(eventName, fn);
  }

  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.emitter.off(eventName, fn);
  }

  emit<K extends EventKey<T>>(eventName: K, params: { data: T[K]; initiator?: IUser}) {
    this.emitter.emit(eventName, params);
  }
}
export default MyEmitter;
