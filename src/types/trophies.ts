export type TrophyWinner = {
  user: string;
  count: number;
  is_adult: boolean;
} | null;

export type ZoneTrophy = {
  label: string;
  overall: TrophyWinner;
  student: TrophyWinner;
};

export type TrophyResults = {
  zones: ZoneTrophy[];
  turtles: {
    overall: TrophyWinner;
    student: TrophyWinner;
  };
};

export type RosterRow = {
  inat_login: string;
  display_name_ui: string;
  is_adult: boolean;
  exclude_from_scoring: boolean;
};
