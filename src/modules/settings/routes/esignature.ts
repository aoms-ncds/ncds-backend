import {Router} from 'express';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';

import esignature from '../../settings/models/esignature';
import Division from '../../divisions/models/Division';

const esignatureRouter = Router();


/**
 * For Adding new Signature
 * [POST] /settings/esignature/
 *
 * @author <seshumadhavan2000@gmail.com>, <@5eshumadhavan>
 *
 */
esignatureRouter.patch('/', authCheck([]), async (req, res, next) => {
  try {
    console.log(req.body, 'req.body');
    const e =await esignature.findOne();
    console.log(e, 'eeee');

    const postcheck = req.body;
    let signature;
    console.log(postcheck.presidentSignature?._id, 'eddi');
    console.log(e?.presidentSignature, 'eddi2');
    if (postcheck.s2) {
      signature = esignature.updateOne({}, {
        presidentSignature:
        req.body.s2,
      }, {upsert: true} );
    } else if (postcheck.s1) {
      console.log('ELSSSE');
      signature = esignature.updateOne({}, {
        officeManagerSignature:
        req.body.s1,
      }, {upsert: true} );
    } else if (postcheck.s3) {
      signature = esignature.updateOne({}, {
        prevOfficeManagerSignature:
        req.body.s3,
      }, {upsert: true} );
    }
    sendStandardResponse(res, 'OK', {
      data: await signature,
      message: 'Successfully added new Esignature',
    });
  } catch (error) {
    next(error);
  }
});
esignatureRouter.patch('/officeMngrName', authCheck([]), async (req, res, next) => {
  try {
    console.log(req.body, 'req.bodyw');
    const postcheck = req.body;
    let name;
    console.log({postcheck});
    name = esignature.updateOne({}, {
      officeManagerName: req.body.name,
    }, {upsert: true} );

    // const name = new esignature({
    //   officeManagerName:req.body.name
    // })
    //  name.save()
    sendStandardResponse(res, 'OK', {
      data: await name,
      message: 'Successfully added new Esignature',
    });
  } catch (error) {
    next(error);
  }
});
esignatureRouter.patch('/presidentName', authCheck([]), async (req, res, next) => {
  try {
    console.log(req.body, 'req.bodyw');
    const postcheck = req.body;
    let name;
    console.log({postcheck});
    name = esignature.updateOne({}, {
      presidentName: req.body.name,
    }, {upsert: true} );

    // const name = new esignature({
    //   officeManagerName:req.body.name
    // })
    //  name.save()
    sendStandardResponse(res, 'OK', {
      data: await name,
      message: 'Successfully added new Name',
    });
  } catch (error) {
    next(error);
  }
});
esignatureRouter.patch('/prevOfficeMngrName', authCheck([]), async (req, res, next) => {
  try {
    console.log(req.body, 'req.bodyw');
    const postcheck = req.body;
    let Prevname;
    console.log({postcheck});
    Prevname = esignature.updateOne({}, {
      prevOfficeManagerName: req.body.prevName,
    }, {upsert: true} );

    // const name = new esignature({
    //   officeManagerName:req.body.name
    // })
    //  name.save()
    sendStandardResponse(res, 'OK', {
      data: await Prevname,
      message: 'Successfully added new Esignature',
    });
  } catch (error) {
    next(error);
  }
});
esignatureRouter.patch('/presidentEMail', authCheck([]), async (req, res, next) => {
  try {
    console.log(req.body, 'req.bodyw');
    const postcheck = req.body;
    let email;
    console.log({postcheck});
    email = esignature.updateOne({}, {
      presidentEmail: req.body.email,
    }, {upsert: true} );

    // const name = new esignature({
    //   officeManagerName:req.body.name
    // })
    //  name.save()
    sendStandardResponse(res, 'OK', {
      data: await email,
      message: 'Successfully added Email',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * For making null for the signature which is being deleted
 * [PATCH] /settings/esignature/{signatureType}/remove/
 * [PATCH] /settings/esignature/officeManagerSignature/remove/ - null the officeManagerSignature
 *
 * @author <seshumadhavan2000@gmail.com>, <@5eshumadhavan>
 *
 */
esignatureRouter.patch('/:signatureType/remove/', authCheck([]), async (req, res, next) => {
  try {
    const signatureType = req.params.signatureType;
    console.log({signatureType});
    const signature = esignature.updateOne({}, {
      officeManagerSignature: req.params.signatureType =='officeManagerSignature'?null:undefined,
      prevOfficeManagerSignature: req.params.signatureType =='prevOfficeManagerSignature'?null:undefined,
    }, {upsert: true} );
    sendStandardResponse(res, 'OK', {
      data: await signature,
      message: 'Successfully removed signature',
    });
  } catch (error) {
    next(error);
  }
});


esignatureRouter.get('/', authCheck([]), async (req, res, next) => {
  try {
    const esignatureDocument = await esignature.findOne().populate('officeManagerSignature').populate('presidentSignature').populate('prevOfficeManagerSignature');
    sendStandardResponse(res, 'OK', {
      data: esignatureDocument,
      message: 'Successfully fetched Esignature',
    });
  } catch (error) {
    next(error);
  }
});

export default esignatureRouter;


