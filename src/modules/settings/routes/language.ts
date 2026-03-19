import {Router} from 'express';
import {MongoError} from 'mongodb';
import authCheck from '../../../extras/auth_check';
import {sendStandardResponse} from '../../../extras/helpers';
import Language, {ILanguage} from '../models/language';
import languageEvents from '../events/language_events';
import CommonLifeCycleStates from '../../../extras/CommonLifeCycleStates';

const languageRouter = Router();

languageRouter.get('/', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: Partial<ILanguage> = {};
    conditions.status = CommonLifeCycleStates.ACTIVE;
    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse<ILanguage[]>(res, 'OK', {
      data: await Language.find(conditions),
      message: 'Successfully fetched list of Language',
    });
  } catch (error) {
    next(error);
  }
});

languageRouter.get('/count', authCheck(['READ_ACCESS']), async (req, res, next) => {
  try {
    const conditions: Partial<ILanguage> = {
      status: CommonLifeCycleStates.ACTIVE, // Default to active status
    };

    if (Object.keys(req.query).includes('status')) {
      conditions.status = Number(req.query.status);
    }

    sendStandardResponse<number>(res, 'OK', {
      data: await Language.countDocuments(conditions),
      message: 'Successfully fetched list of Language',
    });
  } catch (error) {
    next(error);
  }
});

languageRouter.post(
  '/',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const language = new Language({...req.body, status: CommonLifeCycleStates.ACTIVE});
      await language.validate();
      sendStandardResponse(res, 'OK', {
        data: await language.save(),
        message: 'Successfully added new language',
      });
      languageEvents.emit('create', {data: language});
    } catch (error) {
      if (error instanceof MongoError && error.code === 11000) {
        // Duplicate entry error
        return sendStandardResponse(res, 'CONFLICT', {
          error: 'Duplicate entry error',
          message: 'Another language with the same name already exists!',
        });
      }
      next(error);
    }
  },
);

languageRouter.get(
  '/:languageId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      sendStandardResponse<ILanguage | null>(res, 'OK', {
        data: await Language.findById(req.params.languageId),
        message: 'Successfully fetched language',
      });
    } catch (error) {
      next(error);
    }
  },
);

languageRouter.patch(
  '/:languageId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      if (
        Object.keys(req.body).includes('activate') ||
        Object.keys(req.body).includes('deactivate')
      ) {
        next(
          new Error(
            'activate and deactivate fields are allowed by this API endpoint!',
          ),
        );
      }
      const previousLanguage = await Language.findById(
        req.params.languageId,
      );
      const newLanguage = await Language.findByIdAndUpdate(
        req.params.languageId,
        req.body,
        {new: true},
      );
      if (!previousLanguage || !newLanguage) {
        return next(new Error('Language ID Not found'));
      }

      sendStandardResponse(res, 'OK', {
        data: newLanguage,
        message: 'Successfully updated Language',
      });
      languageEvents.emit('update', {data: {
        previousLanguage,
        newLanguage,
      }});
    } catch (error) {
      next(error);
    }
  },
);

languageRouter.delete(
  '/:languageId',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const language = await Language.findOneAndUpdate(
        {_id: req.params.languageId},
        {status: CommonLifeCycleStates.DELETED},
        {new: true},
      );
      if (!language) {
        return next(new Error('language ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: language,
        message: 'Successfully deleted language',
      });
      languageEvents.emit('delete', {data: language});
    } catch (error) {
      next(error);
    }
  },
);

languageRouter.delete(
  '/:languageId/force',
  authCheck(['READ_ACCESS']),
  async (req, res, next) => {
    try {
      const language = await Language.findOneAndDelete({
        _id: req.params.languageId,
      });
      if (!language) {
        return next(new Error('language ID Not found'));
      }
      sendStandardResponse(res, 'OK', {
        data: language,
        message: 'Successfully force deleted language',
      });
      // languageEvents.emit('forceDelete', {data: language});
    } catch (error) {
      next(error);
    }
  },
);

export default languageRouter;
