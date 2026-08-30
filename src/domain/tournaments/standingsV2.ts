import type { TournamentMatchV2, TournamentTeamV2 } from "./v2Types";

export type TournamentGroupStandingV2 = {
  teamId: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  sortOrder: number;
};

function hasFinalGroupResult(match: TournamentMatchV2) {
  return (
    match.stage === "group" &&
    match.status === "finished" &&
    match.result.homeScore != null &&
    match.result.awayScore != null
  );
}

export function calculateTournamentGroupStandingsV2({
  teams,
  matches,
  group,
}: {
  teams: readonly TournamentTeamV2[];
  matches: readonly TournamentMatchV2[];
  group: string;
}): TournamentGroupStandingV2[] {
  const groupTeams = teams.filter((team) => team.group === group && team.isActive);
  const rows = new Map<string, TournamentGroupStandingV2>();

  groupTeams.forEach((team) => {
    rows.set(team.id, {
      teamId: team.id,
      group,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      sortOrder: team.sortOrder,
    });
  });

  matches
    .filter((match) => match.group === group && hasFinalGroupResult(match))
    .forEach((match) => {
      const home = rows.get(match.homeTeamId);
      const away = rows.get(match.awayTeamId);
      if (!home || !away) return;

      const homeScore = Number(match.result.homeScore);
      const awayScore = Number(match.result.awayScore);

      home.played += 1;
      away.played += 1;
      home.goalsFor += homeScore;
      home.goalsAgainst += awayScore;
      away.goalsFor += awayScore;
      away.goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
      } else if (awayScore > homeScore) {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }

      home.goalDifference = home.goalsFor - home.goalsAgainst;
      away.goalDifference = away.goalsFor - away.goalsAgainst;
    });

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (b.won !== a.won) return b.won - a.won;
    return a.sortOrder - b.sortOrder;
  });
}
