import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import Particulars, {IParticulars} from '../models/particulars';
import particularEvents from '../events/particular_event';
import FR from '../models/FR';
import FRLifeCycleStates from '../extras/FRLifeCycleStates';
import {FileObject, IFile} from '../../fileUploader/models/Files';
import mongoose from 'mongoose';
import CustomFR from '../models/CustomFR';
import CustomIRO from '../../IRO/models/CustomIRO';
import IRO from '../../IRO/models/IRO';
const particularsRouter = Router();

/**
 * For create a Particullars
 * [POST] /fr/
 *
 * @author <annmariya@computervalley.online>, <@annmariya>
 *
 * ✍🏻
 */
particularsRouter.get('/', authCheck(['READ_FR']), async (req, res, next) => {
  try {
    // const conditions: FilterQuery<IFR> = {
    //   status: FRLifeCycleStates.SUBMITTED_TO_PRESIDENT, // Default to active status
    // };

    // if (Object.keys(req.query).includes('status')) {
    //   conditions.status = Number(req.query.status);
    // }

    sendStandardResponse<IParticulars[]>(res, 'OK', {
      data: await Particulars.find(),
      message: 'Successfully fetched list of FR',
    });
  } catch (error) {
    next(error);
  }
});
particularsRouter.post('/', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    console.log(req.body, '9090');

    const particular = new Particulars({...req.body, status: FRLifeCycleStates.ACTIVE});
    await particular.validate();
    sendStandardResponse(res, 'OK', {
      data: await particular.save(),
      message: 'Successfully added new Particular',
    });
    (Array.isArray(req.body.attachment) ?
      req.body.attachment.map((async (file: mongoose.UpdateQuery<IFile> ) => await FileObject.updateOne({_id: file._id}, {
        refId: particular._id,
      }))):null);
    // console.log('is hereee', req.body.FR);
    await FR.updateOne({_id: req.body.FR}, {
      $push: {particulars: particular._id},
    });
    particularEvents.emit('create', {data: particular});
  } catch (error) {
    next(error);
  }
});
particularsRouter.post('/fr/', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    // Extract ID and filter out particulars from req.body
    const {id, ...particularsObject} = req.body;
console.log(req.body, '98yhd');

    if (!id) {
      return res.status(400).json({error: 'ID is required'});
    }

    // Convert the object into an array of particulars
    const particularsArray = Object.values(particularsObject).filter((item) => typeof item === 'object');

    if (particularsArray.length === 0) {
      return sendStandardResponse(res, 'OK', {
        data: 'No particulars to add',
        message: 'No particulars to add',
      });
    }

    console.log('Parsed Particulars:', particularsArray);

    const objectId = new mongoose.Types.ObjectId(id);

    // Generate new ObjectIds for each particular
    const newParticulars = particularsArray.map((particular) => ({
      ...particular,
      _id: new mongoose.Types.ObjectId(),
      status: FRLifeCycleStates.ACTIVE,
    }));

    // Extract IDs to push into CustomIRO
    const newParticularIds = newParticulars.map((p) => p._id);

    // Update CustomIRO to include new Particular IDs
    const updateResult = await FR.updateOne(
      {_id: objectId},
      {$push: {particulars: {$each: newParticularIds}}},
    );
    const updateResult2 = await IRO.updateOne(
      {FR: objectId},
      {$push: {particulars: {$each: newParticularIds}}},
    );

    console.log('Update Result in CustomIRO:', updateResult);

    // Validate and save all particulars in bulk
    await Particulars.insertMany(newParticulars);

    console.log('Saved Particulars:', newParticulars);

    // Update attachments with reference IDs (if any)
    await Promise.all(
      particularsArray.flatMap((particular:any) =>
        Array.isArray(particular?.attachment) && particular?.attachment?.length > 0 ?
          particular?.attachment?.map((file: { _id: any; }) =>
            FileObject.updateOne({_id: file._id}, {refId: particular._id}),
          ) :
          [],
      ),
    );

    // Emit events for each new particular
    newParticulars.forEach((particular) =>
      particularEvents.emit('create', {data: particular}),
    );

    // Send response
    sendStandardResponse(res, 'OK', {
      data: newParticulars,
      message: 'Successfully added new Particulars',
    });
  } catch (error) {
    console.error('Error in /customIRO:', error);
    next(error);
  }
});
particularsRouter.post('/IRO/', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    // Extract ID and filter out particulars from req.body
    const {id, ...particularsObject} = req.body;

    if (!id) {
      return res.status(400).json({error: 'ID is required'});
    }

    // Convert the object into an array of particulars
    const particularsArray = Object.values(particularsObject).filter((item) => typeof item === 'object');

    if (particularsArray.length === 0) {
      return sendStandardResponse(res, 'OK', {
        data: 'No particulars to add',
        message: 'No particulars to add',
      });
    }

    console.log('Parsed Particulars:', particularsArray);

    const objectId = new mongoose.Types.ObjectId(id);

    // Generate new ObjectIds for each particular
    const newParticulars = particularsArray.map((particular) => ({
      ...particular,
      _id: new mongoose.Types.ObjectId(),
      status: FRLifeCycleStates.ACTIVE,
    }));

    // Extract IDs to push into CustomIRO
    const newParticularIds = newParticulars.map((p) => p._id);

    // Update CustomIRO to include new Particular IDs
    const updateResult = await IRO.updateOne(
      {_id: objectId},
      {$push: {particulars: {$each: newParticularIds}}},
    );
    const updateResult1 = await FR.updateOne(
      {IRO: objectId},
      {$push: {particulars: {$each: newParticularIds}}},
    );

    console.log('Update Result in CustomIRO:', updateResult);

    // Validate and save all particulars in bulk
    await Particulars.insertMany(newParticulars);

    console.log('Saved Particulars:', newParticulars);

    // Update attachments with reference IDs (if any)
    await Promise.all(
      particularsArray.flatMap((particular:any) =>
        Array.isArray(particular?.attachment) && particular?.attachment?.length > 0 ?
          particular?.attachment?.map((file: { _id: any; }) =>
            FileObject.updateOne({_id: file._id}, {refId: particular._id}),
          ) :
          [],
      ),
    );

    // Emit events for each new particular
    newParticulars.forEach((particular) =>
      particularEvents.emit('create', {data: particular}),
    );

    // Send response
    sendStandardResponse(res, 'OK', {
      data: newParticulars,
      message: 'Successfully added new Particulars',
    });
  } catch (error) {
    console.error('Error in /customIRO:', error);
    next(error);
  }
});
particularsRouter.post('/custom', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    console.log(req.body, 'req.body88');

    const particular = new Particulars({...req.body, status: FRLifeCycleStates.ACTIVE});
    await particular.validate();
    sendStandardResponse(res, 'OK', {
      data: await particular.save(),
      message: 'Successfully added new Particular',
    });
    (Array.isArray(req.body.attachment) ?
      req.body.attachment.map((async (file: mongoose.UpdateQuery<IFile> ) => await FileObject.updateOne({_id: file._id}, {
        refId: particular._id,
      }))):null);
    // console.log('is hereee', req.body.FR);
    await CustomFR.updateOne({_id: req.body.FR}, {
      $push: {particulars: particular._id},
    });
    particularEvents.emit('create', {data: particular});
  } catch (error) {
    next(error);
  }
});
particularsRouter.post('/customAdd', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    const particular = new Particulars({...req.body, status: FRLifeCycleStates.ACTIVE});
    await particular.validate();
    sendStandardResponse(res, 'OK', {
      data: await particular.save(),
      message: 'Successfully added new Particular',
    });
    (Array.isArray(req.body.attachment) ?
      req.body.attachment.map((async (file: mongoose.UpdateQuery<IFile> ) => await FileObject.updateOne({_id: file._id}, {
        refId: particular._id,
      }))):null);
    // console.log('is hereee', req.body.FR);
    await CustomIRO.updateOne({_id: req.body.FR}, {
      $push: {particulars: particular._id},
    });
    particularEvents.emit('create', {data: particular});
  } catch (error) {
    next(error);
  }
});
particularsRouter.post('/customIRO', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    // Extract ID and filter out particulars from req.body
    const {id, ...particularsObject} = req.body;

    if (!id) {
      return res.status(400).json({error: 'ID is required'});
    }

    // Convert the object into an array of particulars
    const particularsArray = Object.values(particularsObject).filter((item) => typeof item === 'object');

    if (particularsArray.length === 0) {
      return sendStandardResponse(res, 'OK', {
        data: 'No particulars to add',
        message: 'No particulars to add',
      });
    }

    console.log('Parsed Particulars:', particularsArray);

    const objectId = new mongoose.Types.ObjectId(id);

    // Generate new ObjectIds for each particular
    const newParticulars = particularsArray.map((particular) => ({
      ...particular,
      _id: new mongoose.Types.ObjectId(),
      status: FRLifeCycleStates.ACTIVE,
    }));

    // Extract IDs to push into CustomIRO
    const newParticularIds = newParticulars.map((p) => p._id);

    // Update CustomIRO to include new Particular IDs
    const updateResult = await CustomIRO.updateOne(
      {_id: objectId},
      {$push: {particulars: {$each: newParticularIds}}},
    );

    console.log('Update Result in CustomIRO:', updateResult);

    // Validate and save all particulars in bulk
    await Particulars.insertMany(newParticulars);

    console.log('Saved Particulars:', newParticulars);

    // Update attachments with reference IDs (if any)
    await Promise.all(
      particularsArray.flatMap((particular:any) =>
        Array.isArray(particular?.attachment) && particular?.attachment?.length > 0 ?
          particular?.attachment?.map((file: { _id: any; }) =>
            FileObject.updateOne({_id: file._id}, {refId: particular._id}),
          ) :
          [],
      ),
    );

    // Emit events for each new particular
    newParticulars.forEach((particular) =>
      particularEvents.emit('create', {data: particular}),
    );

    // Send response
    sendStandardResponse(res, 'OK', {
      data: newParticulars,
      message: 'Successfully added new Particulars',
    });
  } catch (error) {
    console.error('Error in /customIRO:', error);
    next(error);
  }
});
particularsRouter.post('/customFR', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    // Extract ID and filter out particulars from req.body
    const {id, ...particularsObject} = req.body;

    // if (!id) {
    //   return res.status(400).json({error: 'ID is required'});
    // }

    // Convert the object into an array of particulars
    const particularsArray = Object.values(particularsObject).filter((item) => typeof item === 'object');

    if (particularsArray.length === 0) {
      return sendStandardResponse(res, 'OK', {
        data: 'No particulars to add',
        message: 'No particulars to add',
      });
    }

    console.log('Parsed Particulars:', particularsArray);

    const objectId = new mongoose.Types.ObjectId(id);

    // Generate new ObjectIds for each particular
    const newParticulars = particularsArray.map((particular) => ({
      ...particular,
      _id: new mongoose.Types.ObjectId(),
      status: FRLifeCycleStates.ACTIVE,
    }));

    // Extract IDs to push into CustomIRO
    const newParticularIds = newParticulars.map((p) => p._id);

    // Update CustomIRO to include new Particular IDs
    const updateResult = await CustomFR.updateOne(
      {_id: objectId},
      {$push: {particulars: {$each: newParticularIds}}},
    );

    console.log('Update Result in CustomIRO:', updateResult);

    // Validate and save all particulars in bulk
    await Particulars.insertMany(newParticulars);

    console.log('Saved Particulars:', newParticulars);

    // Update attachments with reference IDs (if any)
    await Promise.all(
      particularsArray.flatMap((particular:any) =>
        Array.isArray(particular?.attachment) && particular?.attachment?.length > 0 ?
          particular?.attachment?.map((file: { _id: any; }) =>
            FileObject.updateOne({_id: file._id}, {refId: particular._id}),
          ) :
          [],
      ),
    );

    // Emit events for each new particular
    newParticulars.forEach((particular) =>
      particularEvents.emit('create', {data: particular}),
    );

    // Send response
    sendStandardResponse(res, 'OK', {
      data: newParticulars,
      message: 'Successfully added new Particulars',
    });
  } catch (error) {
    console.error('Error in /customIRO:', error);
    next(error);
  }
});


particularsRouter.patch('/:particularId', authCheck([]), async (req, res, next) => {
  try {
    if (Object.keys(req.body).includes('activate') || Object.keys(req.body).includes('deactivate')) {
      next(new Error('activate and deactivate fields are allowed by this API endpoint!'));
    }
    const previousParticulars = await Particulars.findById(req.params.particularId);
    const newParticulars = await Particulars.findByIdAndUpdate(req.params.particularId, req.body, {new: true});
    // if (!previousParticulars || !newParticulars) {
    //   return next(new Error('Particular ID Not found'));
    // }

    await FR.updateOne({_id: req.body.FR}, {
      $push: {Particulars: req.params.particularId},
    });
    await IRO.updateOne({_id: req.body.FR}, {
      $push: {Particulars: req.params.particularId},
    });
    sendStandardResponse(res, 'OK', {
      data: newParticulars,
      message: 'Successfully updated Particulars',
    });
    particularEvents.emit('update', {data: {previousParticulars, newParticulars}});
  } catch (error) {
    next(error);
  }
});
particularsRouter.delete('/:particularId', authCheck(['WRITE_FR']), async (req, res, next) => {
  try {
    console.log(req.params.particularId, 'opop');

    const particular = await Particulars.findOneAndDelete({_id: req.params.particularId}, {new: true});
    console.log(particular, 'particular99');
console.log(particular?.FR, 'particular?.FR');

    await FR.updateOne({_id: particular?.FR}, {
      $pull: {particulars: req.params.particularId},
    });
    await IRO.updateOne({FR: particular?.FR}, {
      $pull: {particulars: req.params.particularId},
    });
    console.log(particular, 'particular33');
    if (!particular) {
      return next(new Error('Particular ID not found'));
    }
    sendStandardResponse(res, 'OK', {
      data: particular,
      message: 'Successfully deleted particulars',
    });
    particularEvents.emit('delete', {data: particular});
  } catch (error) {
    next(error);
  }
});

export default particularsRouter;
