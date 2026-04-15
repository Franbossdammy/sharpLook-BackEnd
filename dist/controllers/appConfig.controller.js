"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("../middlewares/error");
const response_1 = __importDefault(require("../utils/response"));
const AppConfig_1 = __importDefault(require("../models/AppConfig"));
class AppConfigController {
    constructor() {
        /**
         * GET /api/v1/app/version
         * Public — called by the mobile app on every launch
         */
        this.getVersion = (0, error_1.asyncHandler)(async (_req, res, _next) => {
            let config = await AppConfig_1.default.findOne();
            // Seed defaults on first call if collection is empty
            if (!config) {
                config = await AppConfig_1.default.create({});
            }
            return response_1.default.success(res, 'App version info', {
                minimumVersion: config.minimumVersion,
                latestVersion: config.latestVersion,
                forceUpdate: config.forceUpdate,
                updateMessage: config.updateMessage,
                ios: { storeUrl: 'https://apps.apple.com/app/id6749508043' },
                android: { storeUrl: 'https://play.google.com/store/apps/details?id=com.inuud.sharplook' },
            });
        });
        /**
         * PATCH /api/v1/app/version
         * Admin only — called from the admin dashboard
         */
        this.updateVersion = (0, error_1.asyncHandler)(async (req, res, _next) => {
            const { minimumVersion, latestVersion, forceUpdate, updateMessage } = req.body;
            let config = await AppConfig_1.default.findOne();
            if (!config) {
                config = await AppConfig_1.default.create({});
            }
            if (minimumVersion !== undefined)
                config.minimumVersion = minimumVersion;
            if (latestVersion !== undefined)
                config.latestVersion = latestVersion;
            if (forceUpdate !== undefined)
                config.forceUpdate = forceUpdate;
            if (updateMessage !== undefined)
                config.updateMessage = updateMessage;
            await config.save();
            return response_1.default.success(res, 'App version config updated', {
                minimumVersion: config.minimumVersion,
                latestVersion: config.latestVersion,
                forceUpdate: config.forceUpdate,
                updateMessage: config.updateMessage,
            });
        });
    }
}
exports.default = new AppConfigController();
//# sourceMappingURL=appConfig.controller.js.map