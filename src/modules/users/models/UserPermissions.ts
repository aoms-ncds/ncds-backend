import {Schema, model} from 'mongoose';

export interface IUserPermissions {

    READ_ACCESS: boolean;// Basic access permission
    ADMIN_ACCESS:boolean;// Admin access


    READ_WORKERS: boolean; // For reading workers
    WRITE_WORKERS: boolean; // For adding and editing worker details
    MANAGE_WORKER:boolean;// For approving Workers

    READ_STAFFS: boolean;// For reading staffs
    WRITE_STAFFS: boolean;// For adding and editing staff details

    READ_DIVISIONS: boolean; // For reading divisions
    READ_ALL_DIVISIONS: boolean; // For reading All divisions
    WRITE_DIVISIONS: boolean; // For adding and editing division details

    READ_FR: boolean; // For reading FRs
    WRITE_FR: boolean; // For adding and editing FR details
    PRESIDENT_ACCESS:boolean;// President access
    MANAGE_FR:boolean;// For Approving FR
    RAISE_WORKERS_FR:boolean;// For RAISE WORKERS FR

    READ_IRO: boolean; // For reading IROs
    WRITE_IRO: boolean; // For editing IRO details
    OFFICE_MNGR_ACCESS :boolean;// For Office Mngr
    ACCOUNTS_MNGR_ACCESS:boolean;// For Accounts Mngr access
    MANAGE_IRO:boolean;//  For approving IRO

    READ_APPLICATION:boolean; // For reading applications
    WRITE_APPLICATION:boolean; // For adding and editing application details
    MANAGE_APPLICATION:boolean;// For approving Application

    FCRA_ACCOUNTS_ACCESS:boolean;
    LOCAL_ACCOUNT_ACCESS:boolean;
    HR_DPARTMENT_ACCESS: boolean;
    DELHI_DIVISION_ACCESS: boolean;
    OTHER_ACCOUNTS_ACCESS:boolean;
    OTHER_ACCOUNTS_ACCESS_1:boolean;
    OTHER_ACCOUNTS_ACCESS_2:boolean;
    OTHER_ACCOUNTS_ACCESS_3:boolean;
    OTHER_ACCOUNTS_ACCESS_4:boolean;
    EDIT_DIVISION_ACCESS: boolean;
    AUDIT_VIEW: boolean;
    REOPEN_FR_IRO: boolean;
    CUSTOM_FR_IRO: boolean;
    CUSTOM_REPORT: boolean;
    SETTINGS_SETTINGS_BASE_ACCESS: boolean;

    SETTINGS_MANAGE_LANGUAGES_ACCESS: boolean;
    SETTINGS_DESIGNATION_ACCESS: boolean;
    SETTINGS_CHILD_SUPPORT_ACCESS: boolean;
    SETTINGS_E_SIGN_ACCESS: boolean;
    SETTINGS_DEPARTMENT_ACCESS: boolean;
    SETTINGS_CHILD_SUPPORT_AGE_EDIT_ACCESS: boolean;
    SETTINGS_ADD_GENDER_ACCESS: boolean;
    SETTINGS_ADD_RELIGION_ACCESS: boolean;
    SETTINGS_REASON_FOR_DEACTIVATION_ACCESS: boolean;
    SETTINGS_ADD_SANCTION_ASS_PER_ACCESS: boolean;
    SETTINGS_PARTICULARS_ACCESS: boolean;
    SETTINGS_ADD_PAYMENT_METHOD_ACCESS: boolean;
    SETTINGS_DESIGNATION_CATEGORY_ACCESS: boolean;
    SETTINGS_LEADER_DETAILS_ACCESS: boolean;
    SETTINGS_FR_IRO_LOG_ACCESS: boolean;
    SETTINGS_APPLICATION_ACCESS: boolean;

  }

const UserPermissionsSchema = new Schema<IUserPermissions>(
  {
    READ_ACCESS: {type: Boolean, required: true, default: false},
    ADMIN_ACCESS: {type: Boolean, required: true, default: false},

    READ_WORKERS: {type: Boolean, required: true, default: false},
    WRITE_WORKERS: {type: Boolean, required: true, default: false},
    MANAGE_WORKER: {type: Boolean, required: true, default: false},

    READ_STAFFS: {type: Boolean, required: true, default: false},
    WRITE_STAFFS: {type: Boolean, required: true, default: false},

    READ_DIVISIONS: {type: Boolean, required: true, default: false},
    READ_ALL_DIVISIONS: {type: Boolean, required: true, default: false},
    WRITE_DIVISIONS: {type: Boolean, required: true, default: false},

    READ_FR: {type: Boolean, required: true, default: false},
    WRITE_FR: {type: Boolean, required: true, default: false},
    MANAGE_FR: {type: Boolean, required: true, default: false},
    RAISE_WORKERS_FR: {type: Boolean, required: true, default: false},

    READ_IRO: {type: Boolean, required: true, default: false},
    WRITE_IRO: {type: Boolean, required: true, default: false},
    MANAGE_IRO: {type: Boolean, required: true, default: false},

    READ_APPLICATION: {type: Boolean, required: true, default: false},
    WRITE_APPLICATION: {type: Boolean, required: true, default: false},
    MANAGE_APPLICATION: {type: Boolean, required: true, default: false},


    PRESIDENT_ACCESS: {type: Boolean, required: true, default: false},
    OFFICE_MNGR_ACCESS: {type: Boolean, required: true, default: false},
    ACCOUNTS_MNGR_ACCESS: {type: Boolean, required: true, default: false},

    FCRA_ACCOUNTS_ACCESS: {type: Boolean, required: true, default: false},
    LOCAL_ACCOUNT_ACCESS: {type: Boolean, required: true, default: false},
    OTHER_ACCOUNTS_ACCESS: {type: Boolean, required: true, default: false},

    HR_DPARTMENT_ACCESS: {type: Boolean, required: true, default: false},
    DELHI_DIVISION_ACCESS: {type: Boolean, required: true, default: false},

    OTHER_ACCOUNTS_ACCESS_1: {type: Boolean, required: true, default: false},
    OTHER_ACCOUNTS_ACCESS_2: {type: Boolean, required: true, default: false},
    OTHER_ACCOUNTS_ACCESS_3: {type: Boolean, required: true, default: false},
    OTHER_ACCOUNTS_ACCESS_4: {type: Boolean, required: true, default: false},

    EDIT_DIVISION_ACCESS: {type: Boolean, required: true, default: false},

    AUDIT_VIEW: {type: Boolean, required: false, default: false},
    REOPEN_FR_IRO: {type: Boolean, required: false, default: false},
    CUSTOM_FR_IRO: {type: Boolean, required: false, default: false},
    CUSTOM_REPORT: {type: Boolean, required: false, default: false},
    SETTINGS_SETTINGS_BASE_ACCESS: {type: Boolean, required: false, default: false},

    SETTINGS_MANAGE_LANGUAGES_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_DESIGNATION_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_CHILD_SUPPORT_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_E_SIGN_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_DEPARTMENT_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_CHILD_SUPPORT_AGE_EDIT_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_ADD_GENDER_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_ADD_RELIGION_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_REASON_FOR_DEACTIVATION_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_ADD_SANCTION_ASS_PER_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_PARTICULARS_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_ADD_PAYMENT_METHOD_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_DESIGNATION_CATEGORY_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_LEADER_DETAILS_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_FR_IRO_LOG_ACCESS: {type: Boolean, required: false, default: false},
    SETTINGS_APPLICATION_ACCESS: {type: Boolean, required: false, default: false},

  },

  {timestamps: true},
);

const UserPermissions = model<IUserPermissions>(
  'user_permissions',
  UserPermissionsSchema,
);
export default UserPermissions;
