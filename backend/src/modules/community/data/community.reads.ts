import { db } from '../../../db/pool';
import type { CommunityLinkRow } from '../community.types';

/** Active links, in display order. */
export async function findActiveCommunityLinks(): Promise<CommunityLinkRow[]> {
  const { rows } = await db.query<CommunityLinkRow>(
    `SELECT id, platform, title, description, button_label, url
       FROM community_links
      WHERE active
      ORDER BY sort_order, created_at`,
  );
  return rows;
}
