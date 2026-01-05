"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const call_controller_1 = __importDefault(require("../controllers/call.controller"));
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   GET /api/v1/calls/history
 * @desc    Get call history for authenticated user
 * @access  Private
 */
router.get('/history', call_controller_1.default.getCallHistory);
/**
 * @route   GET /api/v1/calls/active
 * @desc    Get active call for authenticated user
 * @access  Private
 */
router.get('/active', call_controller_1.default.getActiveCall);
/**
 * @route   GET /api/v1/calls/:callId
 * @desc    Get call by ID
 * @access  Private
 */
router.get('/:callId', call_controller_1.default.getCall);
/**
 * @route   DELETE /api/v1/calls/:callId
 * @desc    Delete call from history
 * @access  Private
 */
router.delete('/:callId', call_controller_1.default.deleteCall);
exports.default = router;
//# sourceMappingURL=call.routes.js.map