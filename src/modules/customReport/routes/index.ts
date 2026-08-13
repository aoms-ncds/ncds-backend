import {Router} from 'express';
import {sendStandardResponse} from '../../../extras/helpers';
import mongoose, {FilterQuery} from 'mongoose';
import IROLifeCycleStates from '../../IRO/extras/IROLifeCycleStates';
import FRLifeCycleStates from '../../FR/extras/FRLifeCycleStates';
import IRO from '../../IRO/models/IRO';
import FR from '../../FR/models/FR';
import CustomFR from '../../FR/models/CustomFR';
import CustomIRO from '../../IRO/models/CustomIRO';
import {IUser} from '../../users/extras/user_types';
import User from '../../users/models/User';
import Spouse from '../../workers/models/Spouse';
import Child from '../../workers/models/Child';

const CustomReportRouter = Router();

// Helper function to build match conditions for IRO queries
const buildIROMatchConditions = (filter: any) => {
  const matchConditions: any = {kind: 'IRO'};

  // Division filter
  if (!filter.allDivisions && filter?.division?._id) {
    matchConditions.division = new mongoose.Types.ObjectId(filter.division._id);
  }

  // Status filter
  if (filter.iroStatus) {
    matchConditions.status = Number(filter.iroStatus);
  } else {
    matchConditions.status = {
      $nin: [
        IROLifeCycleStates.IRO_REJECTED,
        FRLifeCycleStates.REJECTED,
        IROLifeCycleStates.REJECTED,
      ],
    };
  }

  // Subdivision filter
  if (filter.subdivision?._id) {
    matchConditions.purposeSubdivision = new mongoose.Types.ObjectId(filter.subdivision._id);
  }

  // Sanctioned bank filter
  if (filter.sanctionedBank) {
    matchConditions.$or = [
      {sanctionedBank: filter.sanctionedBank.toString()},
      {sanctionedBank: filter.sanctionedBank.toString().replace(/\s*-\s*/, ' - ')},
    ];
  }

  // Date range filters
  if (filter.iroDateFrom && filter.iroDateTo) {
    matchConditions.IRODate = {
      $gte: new Date(filter.iroDateFrom),
      $lte: new Date(filter.iroDateTo),
    };
  }

  return matchConditions;
};

// Helper function to build particulars match conditions
const buildParticularsMatchConditions = (filter: any) => {
  const conditions: any = {};

  if (filter.reqAmountFrom && filter.reqAmountTo) {
    conditions['particularsData.requestedAmount'] = {
      $gte: Number(filter.reqAmountFrom),
      $lte: Number(filter.reqAmountTo),
    };
  }

  if (filter.sanctAmountFrom && filter.sanctAmountTo) {
    conditions['particularsData.sanctionedAmount'] = {
      $gte: Number(filter.sanctAmountFrom),
      $lte: Number(filter.sanctAmountTo),
    };
  }

  if (filter.mainCategory) {
    conditions['particularsData.mainCategory'] = filter.mainCategory.name;
  }

  if (filter.sanctionedAsPer) {
    conditions['particularsData.sanctionedAsPer'] = filter.sanctionedAsPer;
  }

  if (filter.subCategory1) {
    conditions['particularsData.subCategory1'] = filter.subCategory1;
  }

  if (filter.subCategory2) {
    conditions['particularsData.subCategory2'] = filter.subCategory2;
  }

  if (filter.subCategory3) {
    conditions['particularsData.subCategory3'] = filter.subCategory3;
  }

  return conditions;
};

// Common aggregation pipeline for IRO reports
const getIROAggregationPipeline = (filter: any) => {
  const pipeline: any[] = [
    {
      $match: buildIROMatchConditions(filter),
    },
    {
      $lookup: {
        from: 'particulars',
        localField: 'particulars',
        foreignField: '_id',
        as: 'particularsData',
      },
    },
    {
      $lookup: {
        from: 'divisions',
        localField: 'division',
        foreignField: '_id',
        as: 'divisionData',
      },
    },
    {
      $lookup: {
        from: 'release_amounts',
        localField: 'releaseAmount',
        foreignField: '_id',
        as: 'releaseAmountData',
      },
    },
    {
      $lookup: {
        from: 'sub_divisions',
        localField: 'purposeSubdivision',
        foreignField: '_id',
        as: 'subDivData',
      },
    },
    {
      $unwind: {path: '$particularsData', preserveNullAndEmptyArrays: true},
    },
    {
      $unwind: {path: '$divisionData', preserveNullAndEmptyArrays: true},
    },
    {
      $unwind: {path: '$releaseAmountData', preserveNullAndEmptyArrays: true},
    },
    {
      $unwind: {path: '$subDivData', preserveNullAndEmptyArrays: true},
    },
  ];

  // Add particulars match conditions if any
  const particularsConditions = buildParticularsMatchConditions(filter);
  if (Object.keys(particularsConditions).length > 0) {
    pipeline.push({$match: particularsConditions});
  }

  // Add date range filter if provided
  if (filter.dateRange?.startDate && filter.dateRange?.endDate) {
    pipeline.push({
      $match: {
        IRODate: {
          $gte: new Date(filter.dateRange.startDate),
          $lte: new Date(filter.dateRange.endDate),
        },
      },
    });
  }

  return pipeline;
};

CustomReportRouter.post('/', async (req, res) => {
  try {
    const {filter} = req.body;

    if (!filter) {
      return sendStandardResponse(res, 'BAD REQUEST', {
        message: 'Filter parameters are required',
      });
    }

    // Execute queries for both IRO and CustomIRO
    const [iroResults, customIroResults] = await Promise.all([
      IRO.aggregate(getIROAggregationPipeline(filter)),
      CustomIRO.aggregate(getIROAggregationPipeline(filter)),
    ]);

    const combinedResults = [...iroResults, ...customIroResults];

    // Log for debugging (remove in production)
    console.log(`Found ${combinedResults.length} records`);

    sendStandardResponse(res, 'OK', {
      data: combinedResults,
      message: 'Successfully fetched IRO reports',
      // count: combinedResults.length
    });
  } catch (error) {
    console.error('Error fetching IRO reports:', error);
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      message: 'Failed to fetch reports',
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function for FR queries
const buildFRMatchConditions = (filter: any) => {
  const matchConditions: any = {kind: 'FRs'};

  if (!filter.allDivisions && filter?.division?._id) {
    matchConditions.division = new mongoose.Types.ObjectId(filter.division._id);
  }

  if (filter.frStatus) {
    matchConditions.status = Number(filter.frStatus);
  } else if (!filter.iroStatus) {
    matchConditions.status = {
      $nin: [
        IROLifeCycleStates.IRO_REJECTED,
        FRLifeCycleStates.REJECTED,
        IROLifeCycleStates.REJECTED,
      ],
    };
  }

  if (filter.frDateFrom && filter.frDateTo) {
    const endDate = new Date(filter.frDateTo);
    endDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() + 1); // 🔥 ADD 1 DAY
    matchConditions.FRdate = {
      $gte: new Date(filter.frDateFrom),
      $lte: endDate,
    };
  }

  if (filter.sanctionedBank) {
    matchConditions.$or = [
      {sanctionedBank: filter.sanctionedBank.toString()},
      {sanctionedBank: filter.sanctionedBank.toString().replace(/\s*-\s*/, ' - ')},
    ];
  }

  return matchConditions;
};

CustomReportRouter.post('/fr', async (req, res) => {
  try {
    const {filter} = req.body;

    if (!filter) {
      return sendStandardResponse(res, 'BAD REQUEST', {
        message: 'Filter parameters are required',
      });
    }

    const pipeline = [
      {
        $match: buildFRMatchConditions(filter),
      },
      {
        $lookup: {
          from: 'particulars',
          localField: 'particulars',
          foreignField: '_id',
          as: 'particularsData',
        },
      },
      {
        $lookup: {
          from: 'divisions',
          localField: 'division',
          foreignField: '_id',
          as: 'divisionData',
        },
      },
      {
        $lookup: {
          from: 'transactions',
          localField: 'IRO',
          foreignField: '_id',
          as: 'IROdata',
        },
      },
      {
        $lookup: {
          from: 'sub_divisions',
          localField: 'purposeSubdivision',
          foreignField: '_id',
          as: 'subDivData',
        },
      },
      {
        $unwind: {path: '$particularsData', preserveNullAndEmptyArrays: true},
      },
      {
        $unwind: {path: '$divisionData', preserveNullAndEmptyArrays: true},
      },
      {
        $unwind: {path: '$IROdata', preserveNullAndEmptyArrays: true},
      },
      {
        $unwind: {path: '$subDivData', preserveNullAndEmptyArrays: true},
      },
    ];

    // Add particulars conditions
    const particularsConditions = buildParticularsMatchConditions(filter);
    if (Object.keys(particularsConditions).length > 0) {
      pipeline.push({$match: particularsConditions});
    }

    // Add date range filter
    if (filter.dateRange?.startDate && filter.dateRange?.endDate) {
      pipeline.push({
        $match: {
          FRdate: {
            $gte: new Date(filter.dateRange.startDate),
            $lte: new Date(filter.dateRange.endDate),
          },
        },
      });
    }

    // Execute queries
    const [frResults, customFrResults] = await Promise.all([
      FR.aggregate(pipeline),
      CustomFR.aggregate(pipeline),
    ]);

    const combinedResults = [...frResults, ...customFrResults];

    sendStandardResponse(res, 'OK', {
      data: combinedResults,
      message: 'Successfully fetched FR reports',
      // count: combinedResults.length
    });
  } catch (error) {
    console.error('Error fetching FR reports:', error);
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      message: 'Failed to fetch FR reports',
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
CustomReportRouter.post('/workerDetails', async (req, res) => {
  try {
    const query: FilterQuery<IUser> = {};
    const {filter} = req.body;

    // ----------------------------
    // BASIC DETAILS
    // ----------------------------


    if (filter.status) {
      query['status'] = filter.status;
    }
    if (filter.hasInsurance === true && filter.insurance?.impactNo !== null && filter.insurance?.impactNo !== undefined) {
      query['insurance.impactNo'] = {$ne: null}; // MongoDB: return docs where impactNo is not null
    }

    if (filter.firstName) {
      query['basicDetails.firstName'] = {
        $regex: filter.firstName,
        $options: 'i',
      };
    }
    if (filter.organization) {
      query['organization'] = {
        $regex: filter.organization,
        $options: 'i',
      };
    }

    if (filter.middleName) {
      query['basicDetails.middleName'] = {
        $regex: filter.middleName,
        $options: 'i',
      };
    }
    if (filter.title) {
      query['basicDetails.title'] = {
        $regex: filter.title,
        $options: 'i',
      };
    }

    if (filter.lastName) {
      query['basicDetails.lastName'] = {
        $regex: filter.lastName,
        $options: 'i',
      };
    }

    if (filter.phone) {
      query['basicDetails.phone'] = {
        $regex: filter.phone,
        $options: 'i',
      };
    }

    if (filter.alternativePhone) {
      query['basicDetails.alternativePhone'] = {
        $regex: filter.alternativePhone,
        $options: 'i',
      };
    }

    if (filter.email) {
      query['basicDetails.email'] = {
        $regex: filter.email,
        $options: 'i',
      };
    }

    if (filter.email2) {
      query['basicDetails.email2'] = {
        $regex: filter.email2,
        $options: 'i',
      };
    }

    if (filter.gender) {
      query['basicDetails.gender'] = filter.gender;
    }

    if (filter.field) {
      query['basicDetails.field'] = filter.field;
    }

    if (filter.maritalStatus) {
      query['basicDetails.martialStatus'] = filter.maritalStatus;
    }

    if (filter.religion) {
      query['basicDetails.religion'] = filter.religion;
    }

    if (filter.highestQualification) {
      query['basicDetails.highestQualification'] = {
        $regex: filter.highestQualification,
        $options: 'i',
      };
    }

    if (filter.communicationLanguage) {
      query['basicDetails.communicationLanguage'] =
        filter.communicationLanguage;
    }

    if (filter.motherTongue) {
      query['basicDetails.motherTongue'] = filter.motherTongue;
    }

    if (filter.knownLanguages?.length) {
      query['basicDetails.knownLanguages'] = {
        $in: filter.knownLanguages,
      };
    }

    if (filter.PANNo) {
      query['basicDetails.PANNo'] = {
        $regex: filter.PANNo,
        $options: 'i',
      };
    }

    if (filter.aadhaarNo) {
      query['basicDetails.aadhaar.aadhaarNo'] = {
        $regex: filter.aadhaarNo,
        $options: 'i',
      };
    }

    if (filter.voterIdNo) {
      query['basicDetails.voterId.voterIdNo'] = {
        $regex: filter.voterIdNo,
        $options: 'i',
      };
    }

    if (filter.licenseNumber) {
      query['basicDetails.licenseNumber'] = {
        $regex: filter.licenseNumber,
        $options: 'i',
      };
    }

    // ----------------------------
    // ADDRESS FILTERS
    // ----------------------------

    if (filter.currentCity) {
      query['basicDetails.currentOfficialAddress.city'] = {
        $regex: filter.currentCity,
        $options: 'i',
      };
    }

    if (filter.currentState) {
      query['basicDetails.currentOfficialAddress.state'] = {
        $regex: filter.currentState,
        $options: 'i',
      };
    }

    if (filter.currentCountry) {
      query['basicDetails.currentOfficialAddress.country'] = {
        $regex: filter.currentCountry,
        $options: 'i',
      };
    }

    if (filter.permanentCity) {
      query['basicDetails.permanentAddress.city'] = {
        $regex: filter.permanentCity,
        $options: 'i',
      };
    }

    if (filter.permanentState) {
      query['basicDetails.permanentAddress.state'] = {
        $regex: filter.permanentState,
        $options: 'i',
      };
    }

    if (filter.permanentCountry) {
      query['basicDetails.permanentAddress.country'] = {
        $regex: filter.permanentCountry,
        $options: 'i',
      };
    }

    if (filter.residingCity) {
      query['basicDetails.residingAddress.city'] = {
        $regex: filter.residingCity,
        $options: 'i',
      };
    }

    if (filter.residingState) {
      query['basicDetails.residingAddress.state'] = {
        $regex: filter.residingState,
        $options: 'i',
      };
    }

    if (filter.residingCountry) {
      query['basicDetails.residingAddress.country'] = {
        $regex: filter.residingCountry,
        $options: 'i',
      };
    }

    // ----------------------------
    // DATE FILTERS
    // ----------------------------

    if (filter.dobFrom || filter.dobTo) {
      query['basicDetails.dateOfBirth'] = {};

      if (filter.dobFrom) {
        query['basicDetails.dateOfBirth'].$gte = new Date(filter.dobFrom);
      }

      if (filter.dobTo) {
        query['basicDetails.dateOfBirth'].$lte = new Date(filter.dobTo);
      }
    }

    if (filter.dateOfJoiningFrom || filter.dateOfJoiningTo) {
      query['officialDetails.dateOfJoining'] = {};

      if (filter.dateOfJoiningFrom) {
        query['officialDetails.dateOfJoining'].$gte = new Date(
          filter.dateOfJoiningFrom,
        );
      }

      if (filter.dateOfJoiningTo) {
        query['officialDetails.dateOfJoining'].$lte = new Date(
          filter.dateOfJoiningTo,
        );
      }
    }

    if (filter.dateOfLeavingFrom || filter.dateOfLeavingTo) {
      query['officialDetails.dateOfLeaving'] = {};

      if (filter.dateOfLeavingFrom) {
        query['officialDetails.dateOfLeaving'].$gte = new Date(
          filter.dateOfLeavingFrom,
        );
      }

      if (filter.dateOfLeavingTo) {
        query['officialDetails.dateOfLeaving'].$lte = new Date(
          filter.dateOfLeavingTo,
        );
      }
    }

    // ----------------------------
    // OFFICIAL DETAILS
    // ----------------------------

    if (filter.division) {
      query['division'] =new mongoose.Types.ObjectId(filter.division._id);
    }
    if (filter.subDivision?._id) {
      query['officialDetails.divisionHistory.0.subDivision'] = new mongoose.Types.ObjectId(filter.subDivision._id);
    }


    if (filter.department) {
      query['supportDetails.department'] = filter.department;
    }

    if (filter.designation) {
      query['supportDetails.designation'] = filter.designation;
    }

    if (filter.otherDesignation) {
      query['supportDetails.otherDesignation'] = {
        $regex: filter.otherDesignation,
        $options: 'i',
      };
    }

    // query['supportDetails.withChurch'] = {$in: [false, null]};


    // query['supportDetails.selfSupport'] = {$in: [false, null]};


    if (filter.typeOfFamily) {
      query['supportDetails.typeOfFamily'] = filter.typeOfFamily;
    }

    // if (filter.noOfChurches) {
    //   query['officialDetails.noOfChurches'] = {
    //     $gte: filter.noOfChurches[0],
    //     $lte: filter.noOfChurches[1],
    //   };
    // }

    // if (filter.yearsInMinistry) {
    //   query['supportDetails.totalNoOfYearsInMinistry'] = {
    //     $gte: filter.yearsInMinistry[0],
    //     $lte: filter.yearsInMinistry[1],
    //   };
    // }

    // ----------------------------
    // SUPPORT DETAILS
    // ----------------------------

    // if (filter.percentSelfSupport) {
    //   query['supportDetails.percentageofSelfSupport'] = {
    //     $gte: filter.percentSelfSupport[0],
    //     $lte: filter.percentSelfSupport[1],
    //   };
    // }

    // if (filter.totalAmount) {
    //   query['supportDetails.totalAmount'] = {
    //     $gte: filter.totalAmount[0],
    //     $lte: filter.totalAmount[1],
    //   };
    // }

    // if (filter.monthlyDeduction) {
    //   query['supportDetails.monthlyDeduction'] = {
    //     $gte: filter.monthlyDeduction[0],
    //     $lte: filter.monthlyDeduction[1],
    //   };
    // }

    // // ----------------------------
    // // SUPPORT STRUCTURE
    // // ----------------------------

    // if (filter.basic) {
    //   query['supportStructure.basic'] = {
    //     $gte: filter.basic[0],
    //     $lte: filter.basic[1],
    //   };
    // }

    // if (filter.HRA) {
    //   query['supportStructure.HRA'] = {
    //     $gte: filter.HRA[0],
    //     $lte: filter.HRA[1],
    //   };
    // }

    // if (filter.impactDeduction) {
    //   query['supportStructure.impactDeduction'] = {
    //     $gte: filter.impactDeduction[0],
    //     $lte: filter.impactDeduction[1],
    //   };
    // }

    // if (filter.telAllowance) {
    //   query['supportStructure.telAllowance'] = {
    //     $gte: filter.telAllowance[0],
    //     $lte: filter.telAllowance[1],
    //   };
    // }

    // if (filter.MUTDeduction) {
    //   query['supportStructure.MUTDeduction'] = {
    //     $gte: filter.MUTDeduction[0],
    //     $lte: filter.MUTDeduction[1],
    //   };
    // }

    // // query['supportStructure.supportEnabled'] = {$in: [false, null]};

    // // ----------------------------
    // // INSURANCE
    // // ----------------------------

    // if (filter.impactNo) {
    //   query['insurance.impactNo'] = {
    //     $regex: filter.impactNo,
    //     $options: 'i',
    //   };
    // }

    // if (filter.nominee) {
    //   query['insurance.nominee'] = {
    //     $regex: filter.nominee,
    //     $options: 'i',
    //   };
    // }

    // if (filter.relation) {
    //   query['insurance.relation'] = {
    //     $regex: filter.relation,
    //     $options: 'i',
    //   };
    // }

    // ----------------------------
    // FETCH USERS
    // ----------------------------
    // console.log(query, 'wewe');
    console.log(filter, 'didi');

    const users = await User.find(query)
      .populate('supportDetails.designation')
      .populate('supportDetails.department')
      .populate('division')
      .populate('officialDetails.divisionHistory.division')
      .populate('officialDetails.divisionHistory.subDivision')
      .populate('basicDetails.communicationLanguage')
      .populate('basicDetails.motherTongue')
      .lean();
    // console.log(users, 'uuus');


    sendStandardResponse(res, 'OK', {
      data: users,
      message: 'Successfully fetched worker details',
      // count: combinedResults.length
    });
  } catch (error) {
    console.error('Error fetching worker details:', error);
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      message: 'Failed to fetch worker details',
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
CustomReportRouter.post('/spouseDetails', async (req, res) => {
  try {
    const query: FilterQuery<IUser> = {};
    const {filter} = req.body;

    // ----------------------------
    // BASIC DETAILS
    // ----------------------------


    // if (filter.status) {
    //   query['officialDetails.status'] = filter.status;
    // }

    if (filter.firstName) {
      query['basicDetails.firstName'] = {
        $regex: filter.firstName,
        $options: 'i',
      };
    }
      if (filter.hasInsurance === true && filter.insurance?.impactNo !== null && filter.insurance?.impactNo !== undefined) {
      query['insurance.impactNo'] = {$ne: null}; // MongoDB: return docs where impactNo is not null
    }
    if (filter.organization) {
      query['organization'] = {
        $regex: filter.organization,
        $options: 'i',
      };
    }

    if (filter.middleName) {
      query['basicDetails.middleName'] = {
        $regex: filter.middleName,
        $options: 'i',
      };
    }
    if (filter.title) {
      query['basicDetails.title'] = {
        $regex: filter.title,
        $options: 'i',
      };
    }

    if (filter.lastName) {
      query['basicDetails.lastName'] = {
        $regex: filter.lastName,
        $options: 'i',
      };
    }

    if (filter.phone) {
      query['basicDetails.phone'] = {
        $regex: filter.phone,
        $options: 'i',
      };
    }

    if (filter.alternativePhone) {
      query['basicDetails.alternativePhone'] = {
        $regex: filter.alternativePhone,
        $options: 'i',
      };
    }

    if (filter.email) {
      query['basicDetails.email'] = {
        $regex: filter.email,
        $options: 'i',
      };
    }

    if (filter.email2) {
      query['basicDetails.email2'] = {
        $regex: filter.email2,
        $options: 'i',
      };
    }

    if (filter.gender) {
      query['basicDetails.gender'] = filter.gender;
    }

    if (filter.field) {
      query['basicDetails.field'] = filter.field;
    }

    if (filter.maritalStatus) {
      query['basicDetails.martialStatus'] = filter.maritalStatus;
    }

    if (filter.religion) {
      query['basicDetails.religion'] = filter.religion;
    }

    if (filter.highestQualification) {
      query['basicDetails.highestQualification'] = {
        $regex: filter.highestQualification,
        $options: 'i',
      };
    }

    if (filter.communicationLanguage) {
      query['basicDetails.communicationLanguage'] =
        filter.communicationLanguage;
    }

    if (filter.motherTongue) {
      query['basicDetails.motherTongue'] = filter.motherTongue;
    }

    if (filter.knownLanguages?.length) {
      query['basicDetails.knownLanguages'] = {
        $in: filter.knownLanguages,
      };
    }

    if (filter.PANNo) {
      query['basicDetails.PANNo'] = {
        $regex: filter.PANNo,
        $options: 'i',
      };
    }

    if (filter.aadhaarNo) {
      query['basicDetails.aadhaar.aadhaarNo'] = {
        $regex: filter.aadhaarNo,
        $options: 'i',
      };
    }

    if (filter.voterIdNo) {
      query['basicDetails.voterId.voterIdNo'] = {
        $regex: filter.voterIdNo,
        $options: 'i',
      };
    }

    if (filter.licenseNumber) {
      query['basicDetails.licenseNumber'] = {
        $regex: filter.licenseNumber,
        $options: 'i',
      };
    }

    // ----------------------------
    // ADDRESS FILTERS
    // ----------------------------

    if (filter.currentCity) {
      query['basicDetails.currentOfficialAddress.city'] = {
        $regex: filter.currentCity,
        $options: 'i',
      };
    }

    if (filter.currentState) {
      query['basicDetails.currentOfficialAddress.state'] = {
        $regex: filter.currentState,
        $options: 'i',
      };
    }

    if (filter.currentCountry) {
      query['basicDetails.currentOfficialAddress.country'] = {
        $regex: filter.currentCountry,
        $options: 'i',
      };
    }

    if (filter.permanentCity) {
      query['basicDetails.permanentAddress.city'] = {
        $regex: filter.permanentCity,
        $options: 'i',
      };
    }

    if (filter.permanentState) {
      query['basicDetails.permanentAddress.state'] = {
        $regex: filter.permanentState,
        $options: 'i',
      };
    }

    if (filter.permanentCountry) {
      query['basicDetails.permanentAddress.country'] = {
        $regex: filter.permanentCountry,
        $options: 'i',
      };
    }

    if (filter.residingCity) {
      query['basicDetails.residingAddress.city'] = {
        $regex: filter.residingCity,
        $options: 'i',
      };
    }

    if (filter.residingState) {
      query['basicDetails.residingAddress.state'] = {
        $regex: filter.residingState,
        $options: 'i',
      };
    }

    if (filter.residingCountry) {
      query['basicDetails.residingAddress.country'] = {
        $regex: filter.residingCountry,
        $options: 'i',
      };
    }

    // ----------------------------
    // DATE FILTERS
    // ----------------------------

    if (filter.dobFrom || filter.dobTo) {
      query['dateOfBirth'] = {};

      if (filter.dobFrom) {
        query['dateOfBirth'].$gte = new Date(filter?.dobFrom);
      }

      if (filter.dobTo) {
        query['dateOfBirth'].$lte = new Date(filter?.dobTo);
      }
    }

    if (filter.dateOfJoiningFrom || filter.dateOfJoiningTo) {
      query['officialDetails.dateOfJoining'] = {};

      if (filter.dateOfJoiningFrom) {
        query['officialDetails.dateOfJoining'].$gte = new Date(
          filter.dateOfJoiningFrom,
        );
      }

      if (filter.dateOfJoiningTo) {
        query['officialDetails.dateOfJoining'].$lte = new Date(
          filter.dateOfJoiningTo,
        );
      }
    }

    if (filter.dateOfLeavingFrom || filter.dateOfLeavingTo) {
      query['officialDetails.dateOfLeaving'] = {};

      if (filter.dateOfLeavingFrom) {
        query['officialDetails.dateOfLeaving'].$gte = new Date(
          filter.dateOfLeavingFrom,
        );
      }

      if (filter.dateOfLeavingTo) {
        query['officialDetails.dateOfLeaving'].$lte = new Date(
          filter.dateOfLeavingTo,
        );
      }
    }

    // ----------------------------
    // OFFICIAL DETAILS
    // ----------------------------

    if (filter.division) {
      query['division'] =new mongoose.Types.ObjectId(filter.division._id);
    }
    if (filter.subdivision?._id) {
      query['purposeSubdivision'] = new mongoose.Types.ObjectId(filter.subdivision._id);
    }


    if (filter.department) {
      query['supportDetails.department'] = filter.department;
    }

    if (filter.designation) {
      query['supportDetails.designation'] = filter.designation;
    }

    if (filter.otherDesignation) {
      query['supportDetails.otherDesignation'] = {
        $regex: filter.otherDesignation,
        $options: 'i',
      };
    }

    // query['supportDetails.withChurch'] = {$in: [false, null]};


    // query['supportDetails.selfSupport'] = {$in: [false, null]};


    if (filter.typeOfFamily) {
      query['supportDetails.typeOfFamily'] = filter.typeOfFamily;
    }

    // if (filter.noOfChurches) {
    //   query['officialDetails.noOfChurches'] = {
    //     $gte: filter.noOfChurches[0],
    //     $lte: filter.noOfChurches[1],
    //   };
    // }

    // if (filter.yearsInMinistry) {
    //   query['supportDetails.totalNoOfYearsInMinistry'] = {
    //     $gte: filter.yearsInMinistry[0],
    //     $lte: filter.yearsInMinistry[1],
    //   };
    // }

    // ----------------------------
    // SUPPORT DETAILS
    // ----------------------------

    // if (filter.percentSelfSupport) {
    //   query['supportDetails.percentageofSelfSupport'] = {
    //     $gte: filter.percentSelfSupport[0],
    //     $lte: filter.percentSelfSupport[1],
    //   };
    // }

    // if (filter.totalAmount) {
    //   query['supportDetails.totalAmount'] = {
    //     $gte: filter.totalAmount[0],
    //     $lte: filter.totalAmount[1],
    //   };
    // }

    // if (filter.monthlyDeduction) {
    //   query['supportDetails.monthlyDeduction'] = {
    //     $gte: filter.monthlyDeduction[0],
    //     $lte: filter.monthlyDeduction[1],
    //   };
    // }

    // // ----------------------------
    // // SUPPORT STRUCTURE
    // // ----------------------------

    // if (filter.basic) {
    //   query['supportStructure.basic'] = {
    //     $gte: filter.basic[0],
    //     $lte: filter.basic[1],
    //   };
    // }

    // if (filter.HRA) {
    //   query['supportStructure.HRA'] = {
    //     $gte: filter.HRA[0],
    //     $lte: filter.HRA[1],
    //   };
    // }

    // if (filter.impactDeduction) {
    //   query['supportStructure.impactDeduction'] = {
    //     $gte: filter.impactDeduction[0],
    //     $lte: filter.impactDeduction[1],
    //   };
    // }

    // if (filter.telAllowance) {
    //   query['supportStructure.telAllowance'] = {
    //     $gte: filter.telAllowance[0],
    //     $lte: filter.telAllowance[1],
    //   };
    // }

    // if (filter.MUTDeduction) {
    //   query['supportStructure.MUTDeduction'] = {
    //     $gte: filter.MUTDeduction[0],
    //     $lte: filter.MUTDeduction[1],
    //   };
    // }

    // // query['supportStructure.supportEnabled'] = {$in: [false, null]};

    // // ----------------------------
    // // INSURANCE
    // // ----------------------------

    // if (filter.impactNo) {
    //   query['insurance.impactNo'] = {
    //     $regex: filter.impactNo,
    //     $options: 'i',
    //   };
    // }

    // if (filter.nominee) {
    //   query['insurance.nominee'] = {
    //     $regex: filter.nominee,
    //     $options: 'i',
    //   };
    // }

    // if (filter.relation) {
    //   query['insurance.relation'] = {
    //     $regex: filter.relation,
    //     $options: 'i',
    //   };
    // }

    // ----------------------------
    // FETCH USERS
    // ----------------------------
    console.log(query, 'wewe');
    console.log(filter, 'didi');

    const users = await Spouse.find(query)
      .populate('division')

      .lean();
    // console.log(users, 'uuus');


    sendStandardResponse(res, 'OK', {
      data: users,
      message: 'Successfully fetched worker details',
      // count: combinedResults.length
    });
  } catch (error) {
    console.error('Error fetching worker details:', error);
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      message: 'Failed to fetch worker details',
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
CustomReportRouter.post('/childDetails', async (req, res) => {
  try {
    const query: FilterQuery<IUser> = {};
    const {filter} = req.body;

    // ----------------------------
    // BASIC DETAILS
    // ----------------------------


    // if (filter.status) {
    //   query['officialDetails.status'] = filter.status;
    // }

    if (filter.firstName) {
      query['basicDetails.firstName'] = {
        $regex: filter.firstName,
        $options: 'i',
      };
    }
    if (filter.organization) {
      query['organization'] = {
        $regex: filter.organization,
        $options: 'i',
      };
    }

    if (filter.middleName) {
      query['basicDetails.middleName'] = {
        $regex: filter.middleName,
        $options: 'i',
      };
    }
    if (filter.title) {
      query['basicDetails.title'] = {
        $regex: filter.title,
        $options: 'i',
      };
    }

    if (filter.lastName) {
      query['basicDetails.lastName'] = {
        $regex: filter.lastName,
        $options: 'i',
      };
    }

    if (filter.phone) {
      query['basicDetails.phone'] = {
        $regex: filter.phone,
        $options: 'i',
      };
    }

    if (filter.alternativePhone) {
      query['basicDetails.alternativePhone'] = {
        $regex: filter.alternativePhone,
        $options: 'i',
      };
    }

    if (filter.email) {
      query['basicDetails.email'] = {
        $regex: filter.email,
        $options: 'i',
      };
    }

    if (filter.email2) {
      query['basicDetails.email2'] = {
        $regex: filter.email2,
        $options: 'i',
      };
    }

    if (filter.gender) {
      query['basicDetails.gender'] = filter.gender;
    }

    if (filter.field) {
      query['basicDetails.field'] = filter.field;
    }

    if (filter.maritalStatus) {
      query['basicDetails.martialStatus'] = filter.maritalStatus;
    }

    if (filter.religion) {
      query['basicDetails.religion'] = filter.religion;
    }

    if (filter.highestQualification) {
      query['basicDetails.highestQualification'] = {
        $regex: filter.highestQualification,
        $options: 'i',
      };
    }

    if (filter.communicationLanguage) {
      query['basicDetails.communicationLanguage'] =
        filter.communicationLanguage;
    }

    if (filter.motherTongue) {
      query['basicDetails.motherTongue'] = filter.motherTongue;
    }

    if (filter.knownLanguages?.length) {
      query['basicDetails.knownLanguages'] = {
        $in: filter.knownLanguages,
      };
    }

    if (filter.PANNo) {
      query['basicDetails.PANNo'] = {
        $regex: filter.PANNo,
        $options: 'i',
      };
    }

    if (filter.aadhaarNo) {
      query['basicDetails.aadhaar.aadhaarNo'] = {
        $regex: filter.aadhaarNo,
        $options: 'i',
      };
    }

    if (filter.voterIdNo) {
      query['basicDetails.voterId.voterIdNo'] = {
        $regex: filter.voterIdNo,
        $options: 'i',
      };
    }

    if (filter.licenseNumber) {
      query['basicDetails.licenseNumber'] = {
        $regex: filter.licenseNumber,
        $options: 'i',
      };
    }

    // ----------------------------
    // ADDRESS FILTERS
    // ----------------------------

    if (filter.currentCity) {
      query['basicDetails.currentOfficialAddress.city'] = {
        $regex: filter.currentCity,
        $options: 'i',
      };
    }

    if (filter.currentState) {
      query['basicDetails.currentOfficialAddress.state'] = {
        $regex: filter.currentState,
        $options: 'i',
      };
    }

    if (filter.currentCountry) {
      query['basicDetails.currentOfficialAddress.country'] = {
        $regex: filter.currentCountry,
        $options: 'i',
      };
    }

    if (filter.permanentCity) {
      query['basicDetails.permanentAddress.city'] = {
        $regex: filter.permanentCity,
        $options: 'i',
      };
    }

    if (filter.permanentState) {
      query['basicDetails.permanentAddress.state'] = {
        $regex: filter.permanentState,
        $options: 'i',
      };
    }

    if (filter.permanentCountry) {
      query['basicDetails.permanentAddress.country'] = {
        $regex: filter.permanentCountry,
        $options: 'i',
      };
    }

    if (filter.residingCity) {
      query['basicDetails.residingAddress.city'] = {
        $regex: filter.residingCity,
        $options: 'i',
      };
    }

    if (filter.residingState) {
      query['basicDetails.residingAddress.state'] = {
        $regex: filter.residingState,
        $options: 'i',
      };
    }

    if (filter.residingCountry) {
      query['basicDetails.residingAddress.country'] = {
        $regex: filter.residingCountry,
        $options: 'i',
      };
    }

    // ----------------------------
    // DATE FILTERS
    // ----------------------------

    if (filter.dobFrom || filter.dobTo) {
      query['dateOfBirth'] = {};

      if (filter.dobFrom) {
        query['dateOfBirth'].$gte = new Date(filter?.dobFrom);
      }

      if (filter.dobTo) {
        query['dateOfBirth'].$lte = new Date(filter?.dobTo);
      }
    }

    if (filter.dateOfJoiningFrom || filter.dateOfJoiningTo) {
      query['officialDetails.dateOfJoining'] = {};

      if (filter.dateOfJoiningFrom) {
        query['officialDetails.dateOfJoining'].$gte = new Date(
          filter.dateOfJoiningFrom,
        );
      }

      if (filter.dateOfJoiningTo) {
        query['officialDetails.dateOfJoining'].$lte = new Date(
          filter.dateOfJoiningTo,
        );
      }
    }

    if (filter.dateOfLeavingFrom || filter.dateOfLeavingTo) {
      query['officialDetails.dateOfLeaving'] = {};

      if (filter.dateOfLeavingFrom) {
        query['officialDetails.dateOfLeaving'].$gte = new Date(
          filter.dateOfLeavingFrom,
        );
      }

      if (filter.dateOfLeavingTo) {
        query['officialDetails.dateOfLeaving'].$lte = new Date(
          filter.dateOfLeavingTo,
        );
      }
    }

    // ----------------------------
    // OFFICIAL DETAILS
    // ----------------------------

    if (filter.division) {
      query['division'] =new mongoose.Types.ObjectId(filter.division._id);
    }
    if (filter.subdivision?._id) {
      query['purposeSubdivision'] = new mongoose.Types.ObjectId(filter.subdivision._id);
    }


    if (filter.department) {
      query['supportDetails.department'] = filter.department;
    }

    if (filter.designation) {
      query['supportDetails.designation'] = filter.designation;
    }

    if (filter.otherDesignation) {
      query['supportDetails.otherDesignation'] = {
        $regex: filter.otherDesignation,
        $options: 'i',
      };
    }

    // query['supportDetails.withChurch'] = {$in: [false, null]};


    // query['supportDetails.selfSupport'] = {$in: [false, null]};


    if (filter.hasStudying==true) {
      query['studying'] = filter.hasStudying;
    }
    if (filter.hasSupportEnabled==true) {
      query['supportEnabled'] = filter.hasSupportEnabled;
    }
    if (filter.hasWorking==true) {
      query['working'] = filter.hasWorking;
    }

    // if (filter.noOfChurches) {
    //   query['officialDetails.noOfChurches'] = {
    //     $gte: filter.noOfChurches[0],
    //     $lte: filter.noOfChurches[1],
    //   };
    // }

    // if (filter.yearsInMinistry) {
    //   query['supportDetails.totalNoOfYearsInMinistry'] = {
    //     $gte: filter.yearsInMinistry[0],
    //     $lte: filter.yearsInMinistry[1],
    //   };
    // }

    // ----------------------------
    // SUPPORT DETAILS
    // ----------------------------

    // if (filter.percentSelfSupport) {
    //   query['supportDetails.percentageofSelfSupport'] = {
    //     $gte: filter.percentSelfSupport[0],
    //     $lte: filter.percentSelfSupport[1],
    //   };
    // }

    // if (filter.totalAmount) {
    //   query['supportDetails.totalAmount'] = {
    //     $gte: filter.totalAmount[0],
    //     $lte: filter.totalAmount[1],
    //   };
    // }

    // if (filter.monthlyDeduction) {
    //   query['supportDetails.monthlyDeduction'] = {
    //     $gte: filter.monthlyDeduction[0],
    //     $lte: filter.monthlyDeduction[1],
    //   };
    // }

    // // ----------------------------
    // // SUPPORT STRUCTURE
    // // ----------------------------

    // if (filter.basic) {
    //   query['supportStructure.basic'] = {
    //     $gte: filter.basic[0],
    //     $lte: filter.basic[1],
    //   };
    // }

    // if (filter.HRA) {
    //   query['supportStructure.HRA'] = {
    //     $gte: filter.HRA[0],
    //     $lte: filter.HRA[1],
    //   };
    // }

    // if (filter.impactDeduction) {
    //   query['supportStructure.impactDeduction'] = {
    //     $gte: filter.impactDeduction[0],
    //     $lte: filter.impactDeduction[1],
    //   };
    // }

    // if (filter.telAllowance) {
    //   query['supportStructure.telAllowance'] = {
    //     $gte: filter.telAllowance[0],
    //     $lte: filter.telAllowance[1],
    //   };
    // }

    // if (filter.MUTDeduction) {
    //   query['supportStructure.MUTDeduction'] = {
    //     $gte: filter.MUTDeduction[0],
    //     $lte: filter.MUTDeduction[1],
    //   };
    // }

    // // query['supportStructure.supportEnabled'] = {$in: [false, null]};

    // // ----------------------------
    // // INSURANCE
    // // ----------------------------

    // if (filter.impactNo) {
    //   query['insurance.impactNo'] = {
    //     $regex: filter.impactNo,
    //     $options: 'i',
    //   };
    // }

    // if (filter.nominee) {
    //   query['insurance.nominee'] = {
    //     $regex: filter.nominee,
    //     $options: 'i',
    //   };
    // }

    // if (filter.relation) {
    //   query['insurance.relation'] = {
    //     $regex: filter.relation,
    //     $options: 'i',
    //   };
    // }

    // ----------------------------
    // FETCH USERS
    // ----------------------------
    console.log(query, 'wewe');
    console.log(filter, 'didi');

    const users = await Child.find(query)
      .lean();
    console.log(users, 'uuus');


    sendStandardResponse(res, 'OK', {
      data: users,
      message: 'Successfully fetched worker details',
      // count: combinedResults.length
    });
  } catch (error) {
    console.error('Error fetching worker details:', error);
    sendStandardResponse(res, 'INTERNAL SERVER ERROR', {
      message: 'Failed to fetch worker details',
      // error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default CustomReportRouter;
