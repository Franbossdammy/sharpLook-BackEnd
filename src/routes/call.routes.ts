import express from 'express';
import callController from '../controllers/call.controller';
import  {authenticate}  from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/calls/history
 * @desc    Get call history for authenticated user
 * @access  Private
 */
router.get('/history', callController.getCallHistory);

/**
 * @route   GET /api/v1/calls/active
 * @desc    Get active call for authenticated user
 * @access  Private
 */
router.get('/active', callController.getActiveCall);

/**
 * @route   GET /api/v1/calls/:callId
 * @desc    Get call by ID
 * @access  Private
 */
router.get('/:callId', callController.getCall);

/**
 * @route   DELETE /api/v1/calls/:callId
 * @desc    Delete call from history
 * @access  Private
 */
router.delete('/:callId', callController.deleteCall);

export default router;