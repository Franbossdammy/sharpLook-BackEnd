"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appConfig_controller_1 = __importDefault(require("../controllers/appConfig.controller"));
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Public — mobile app checks this on launch
router.get('/version', appConfig_controller_1.default.getVersion);
// Admin only — update version settings from the dashboard
router.patch('/version', auth_1.authenticate, auth_1.requireAdmin, appConfig_controller_1.default.updateVersion);
exports.default = router;
//# sourceMappingURL=appConfig.routes.js.map