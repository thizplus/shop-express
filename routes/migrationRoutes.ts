// routes/migrationRoutes.ts
import express from 'express';
import { getMigratedData, migrateAllowedUsers } from '../controllers/migration/migrationController';


const router = express.Router();

// POST /api/migration/allowed-users
router.post('/allowed-users', migrateAllowedUsers);

// GET /api/migration/allowed-users
router.get('/allowed-users', getMigratedData);

export default router;