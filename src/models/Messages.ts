import {model} from 'mongoose';
import {Schema, Types} from 'mongoose';

declare global {
    interface IMessage {
        title: string;
        body: string;
        read: boolean,
        ref_url?: string,
        recipients: {
            user: Types.ObjectId,
            read: boolean,
        }[],
        type: MessagingServices,
        division:string,

    }

}


const MessageSchema = new Schema<IMessage>({
  title: {type: String, required: true},
  body: {type: String, required: true},
  ref_url: {type: String, required: false},
  read: {type: Boolean, required: true, default: false},
  recipients: [{
    user: {type: Schema.Types.ObjectId, required: true, ref: 'users'},
    read: {type: Boolean, required: true, default: false},
  }],
  type: {type: String, required: true},
  division: {type: String, required: true},
}, {timestamps: true});

const Message = model<IMessage>('messages', MessageSchema);
export default Message;
