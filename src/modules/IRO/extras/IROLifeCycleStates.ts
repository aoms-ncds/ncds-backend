import FRLifeCycleStates from '../../FR/extras/FRLifeCycleStates';

// eslint-disable-next-line require-jsdoc
export default class IROLifeCycleStates extends FRLifeCycleStates {
  public static readonly IRO_CLOSED = -210;
  // public static readonly IRO_SEND_BACK = -211;

  // Active states
  public static readonly WAITING_FOR_OFFICE_MNGR= 211;
  public static readonly WAITING_FOR_ACCOUNTS_MNGR = 212;
  public static readonly WAITING_FOR_ACCOUNTS_STATE = 213;
  public static readonly AMOUNT_RELEASED = 214;
  public static readonly RECONCILIATION_DONE = 215;
  public static readonly WAITING_FOR_RELEASE_AMOUNT = 216;
  public static readonly IRO_IN_PROCESS = 218;
  public static readonly REVERTED_TO_DIVISION = 219;
  public static readonly REOPENED = 220;


  // public static readonly allStatus = ({
  //   CLOSED: IROLifeCycleStates.CLOSED,
  //   SEND_BACK: IROLifeCycleStates.SEND_BACK,
  //   SUBMITTED_TO_PRESIDENT: IROLifeCycleStates.SUBMITTED_TO_PRESIDENT,
  //   SUBMITTED_TO_ACCOUNTS: IROLifeCycleStates.SUBMITTED_TO_ACCOUNTS,
  //   PRESIDENT_APPROVED: IROLifeCycleStates.PRESIDENT_APPROVED,
  //   ACCOUNTS_APPROVED: IROLifeCycleStates.ACCOUNTS_APPROVED,
  //   FR_APPROVED: IROLifeCycleStates.FR_APPROVED,
  // });

  // public static readonly getStatusNameByCode = (code: number) =>{
  //   const statusKeys = Object.keys(IROLifeCycleStates.allStatus);
  //   for (let i = 0; i < statusKeys.length; i++) {
  //     const statusKey = statusKeys[i] as keyof typeof IROLifeCycleStates.allStatus;
  //     if (IROLifeCycleStates.allStatus[statusKey] === code) {
  //       return statusKey;
  //     }
  //   }
  //   return 'Unknown status';
  // };
}
