import axios from 'axios';

class SMSSender {
  static sendToNumber = async (payload: {
    to: string[];
    message: string;
    variables: { [key: string]: unknown };
  }) => {
    try {
      const url = `http://sms.hspsms.com/sendSMS?username=computervalley&message=${encodeURIComponent(
        payload.message,
      )}&sendername=CVALLE&smstype=TRANS&numbers=${payload.to.join(
        ',',
      )}&apikey=30a9ae75-aff3-4f66-b1db-48d7ad119b2b`;

      const res = await axios.get(url);

      console.log('SMS API response:', res.data);

      if (!res.data || res.data.length === 0) {
        throw new Error('Empty response from SMS provider');
      }

      if (Array.isArray(res.data) && res.data[1]?.msgid === '') {
        throw new Error('SMS partner failed to send message');
      }

      console.log('✅ SMS sent successfully');
      return { message: 'Successfully sent SMS' };
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      throw error;
    }
  };
}

export default SMSSender;
