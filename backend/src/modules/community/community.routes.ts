import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { listCommunityLinksHandler } from './community.controller';

/** Links to the club's community groups. Signed-in members only, so the group links aren't public. Mounted at /community */
export const communityRouter = Router();

communityRouter.use(requireAuth);

communityRouter.get('/', listCommunityLinksHandler);
