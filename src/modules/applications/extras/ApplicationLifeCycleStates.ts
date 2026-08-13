import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';

// eslint-disable-next-line require-jsdoc
export default class ApplicationLifeCycleStates extends CommonLifeCycleStates {
  /* eslint-disable require-jsdoc */
  // Inactive states
  public static readonly SENT_TO_PRESIDENT = 300;
  public static readonly REVERT_TO_DIVISION = 301;
  public static readonly REVERT_TO_HR = 302;
}
