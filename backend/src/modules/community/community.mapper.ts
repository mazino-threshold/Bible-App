import type { CommunityLinkDto, CommunityLinkRow } from './community.types';

export function toCommunityLinkDto(row: CommunityLinkRow): CommunityLinkDto {
  return {
    id: row.id,
    platform: row.platform,
    title: row.title,
    description: row.description,
    buttonLabel: row.button_label,
    url: row.url,
  };
}
