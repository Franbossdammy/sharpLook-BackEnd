import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middlewares/error';
import ResponseHandler from '../utils/response';
import AppConfig from '../models/AppConfig';

class AppConfigController {
  /**
   * GET /api/v1/app/version
   * Public — called by the mobile app on every launch
   */
  public getVersion = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    let config = await AppConfig.findOne();

    // Seed defaults on first call if collection is empty
    if (!config) {
      config = await AppConfig.create({});
    }

    return ResponseHandler.success(res, 'App version info', {
      minimumVersion: config.minimumVersion,
      latestVersion:  config.latestVersion,
      forceUpdate:    config.forceUpdate,
      updateMessage:  config.updateMessage,
      ios:     { storeUrl: 'https://apps.apple.com/app/id6749508043' },
      android: { storeUrl: 'https://play.google.com/store/apps/details?id=com.inuud.sharplook' },
    });
  });

  /**
   * PATCH /api/v1/app/version
   * Admin only — called from the admin dashboard
   */
  public updateVersion = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { minimumVersion, latestVersion, forceUpdate, updateMessage } = req.body;

    let config = await AppConfig.findOne();
    if (!config) {
      config = await AppConfig.create({});
    }

    if (minimumVersion !== undefined) config.minimumVersion = minimumVersion;
    if (latestVersion  !== undefined) config.latestVersion  = latestVersion;
    if (forceUpdate    !== undefined) config.forceUpdate    = forceUpdate;
    if (updateMessage  !== undefined) config.updateMessage  = updateMessage;

    await config.save();

    return ResponseHandler.success(res, 'App version config updated', {
      minimumVersion: config.minimumVersion,
      latestVersion:  config.latestVersion,
      forceUpdate:    config.forceUpdate,
      updateMessage:  config.updateMessage,
    });
  });
}

export default new AppConfigController();
