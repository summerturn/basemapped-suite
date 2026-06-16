import { type DB } from '@op-engineering/op-sqlite';
import { CemeteryRepository } from './CemeteryRepository';
import { PlotRepository } from './PlotRepository';
import { GraveRepository } from './GraveRepository';
import { PersonRepository } from './PersonRepository';
import { PhotoRepository } from './PhotoRepository';
import { SearchRepository } from './SearchRepository';

export {
  CemeteryRepository,
  PlotRepository,
  GraveRepository,
  PersonRepository,
  PhotoRepository,
  SearchRepository,
};

export class RepositoryFactory {
  private static instance: RepositoryFactory;
  private db: DB;

  public readonly cemeteries: CemeteryRepository;
  public readonly plots: PlotRepository;
  public readonly graves: GraveRepository;
  public readonly persons: PersonRepository;
  public readonly photos: PhotoRepository;
  public readonly search: SearchRepository;

  private constructor(db: DB) {
    this.db = db;
    this.cemeteries = new CemeteryRepository(db);
    this.plots = new PlotRepository(db);
    this.graves = new GraveRepository(db);
    this.persons = new PersonRepository(db);
    this.photos = new PhotoRepository(db);
    this.search = new SearchRepository(db);
  }

  static getInstance(db: DB): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(db);
    }
    return RepositoryFactory.instance;
  }

  static reset(): void {
    RepositoryFactory.instance = undefined as unknown as RepositoryFactory;
  }
}
