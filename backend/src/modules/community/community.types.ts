/** A community link as stored in the database. */
export interface CommunityLinkRow {
  id: string;
  platform: string;
  title: string;
  description: string;
  button_label: string;
  url: string;
}

/** A community link as sent to the app. */
export interface CommunityLinkDto {
  id: string;
  /** e.g. 'whatsapp' or 'telegram'. The app picks an icon from it. */
  platform: string;
  title: string;
  description: string;
  buttonLabel: string;
  url: string;
}
