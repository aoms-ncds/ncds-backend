import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';

export default class AuthLifeCycleStates extends CommonLifeCycleStates {
    public static readonly PENDING_VERIFICATION = 200;
    public static readonly VERIFIED = 201;
  }
