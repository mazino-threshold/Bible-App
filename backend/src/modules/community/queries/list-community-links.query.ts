import { toCommunityLinkDto } from '../community.mapper';
import type { CommunityLinkDto } from '../community.types';
import { findActiveCommunityLinks } from '../data/community.reads';

export async function listCommunityLinks(): Promise<CommunityLinkDto[]> {
  return (await findActiveCommunityLinks()).map(toCommunityLinkDto);
}
