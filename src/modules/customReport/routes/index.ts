import {Router} from 'express';
import {sendStandardResponse} from '../../../extras/helpers';
import mongoose from 'mongoose';
import IROLifeCycleStates from '../../IRO/extras/IROLifeCycleStates';
import FRLifeCycleStates from '../../FR/extras/FRLifeCycleStates';
import IRO from '../../IRO/models/IRO';
import FR from '../../FR/models/FR';
import CustomFR from '../../FR/models/CustomFR';
import CustomIRO from '../../IRO/models/CustomIRO';

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

export default CustomReportRouter;
