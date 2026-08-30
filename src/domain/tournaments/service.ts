import {
  tournamentRepository,
  type TournamentRepository,
} from "./repository";
import {
  getPreferredTournament,
  getPublicTournaments,
  sortTournamentsByDisplayOrder,
} from "./selectors";
import type { Tournament, TournamentEngine, TournamentStatus } from "./types";

export type TournamentListOptions = {
  publicOnly?: boolean;
  statuses?: readonly TournamentStatus[];
  engines?: readonly TournamentEngine[];
};

export class TournamentService {
  constructor(private readonly repository: TournamentRepository) {}

  async list(options: TournamentListOptions = {}): Promise<Tournament[]> {
    let tournaments = await this.repository.list();

    if (options.publicOnly) {
      tournaments = getPublicTournaments(tournaments);
    }

    if (options.statuses?.length) {
      const statuses = new Set(options.statuses);
      tournaments = tournaments.filter((tournament) =>
        statuses.has(tournament.status),
      );
    }

    if (options.engines?.length) {
      const engines = new Set(options.engines);
      tournaments = tournaments.filter((tournament) =>
        engines.has(tournament.engine),
      );
    }

    return sortTournamentsByDisplayOrder(tournaments);
  }

  async getById(tournamentId: string): Promise<Tournament | null> {
    return this.repository.getById(tournamentId.trim());
  }

  async getBySlug(slug: string): Promise<Tournament | null> {
    return this.repository.getBySlug(slug.trim());
  }

  async getCurrent(): Promise<Tournament | null> {
    return this.repository.getCurrent();
  }

  async getPreferred(): Promise<Tournament | null> {
    return getPreferredTournament(await this.repository.list());
  }

  async resolve(identifier: string): Promise<Tournament | null> {
    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier) {
      return null;
    }

    return (
      (await this.repository.getById(normalizedIdentifier)) ??
      (await this.repository.getBySlug(normalizedIdentifier))
    );
  }
}

export const tournamentService = new TournamentService(tournamentRepository);
