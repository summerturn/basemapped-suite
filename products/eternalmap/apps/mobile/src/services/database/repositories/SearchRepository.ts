import { type DB } from '@op-engineering/op-sqlite';

export interface SearchResult {
  id: string;
  entityType: 'grave' | 'person' | 'plot';
  entityId: string;
  title: string;
  subtitle: string;
  rank: number;
  extra?: Record<string, unknown>;
}

export class SearchRepository {
  constructor(private db: DB) {}

  search(query: string, options?: { limit?: number; types?: SearchResult['entityType'][] }): SearchResult[] {
    const limit = options?.limit ?? 50;
    const types = options?.types ?? ['grave', 'person', 'plot'];
    const like = `%${query}%`;
    const results: SearchResult[] = [];

    if (types.includes('person')) {
      const personResult = this.db.execute(
        `SELECT
           p.id,
           p.first_name,
           p.last_name,
           p.maiden_name,
           p.date_of_birth,
           p.date_of_death,
           g.gps_lat,
           g.gps_lng,
           pl.plot_number,
           s.name as section_name,
           CASE
             WHEN p.first_name LIKE ? THEN 3
             WHEN p.last_name LIKE ? THEN 3
             WHEN p.maiden_name LIKE ? THEN 2
             ELSE 1
           END as rank
         FROM persons p
         LEFT JOIN graves g ON g.id = p.grave_id AND g.deleted_at IS NULL
         LEFT JOIN plots pl ON pl.id = p.plot_id AND pl.deleted_at IS NULL
         LEFT JOIN sections s ON s.id = g.section_id AND s.deleted_at IS NULL
         WHERE p.deleted_at IS NULL
           AND (p.first_name LIKE ? OR p.last_name LIKE ? OR p.maiden_name LIKE ?)
         ORDER BY rank DESC, p.last_name, p.first_name
         LIMIT ?`,
        [like, like, like, like, like, like, limit]
      );
      for (let i = 0; i < personResult.rows.length; i++) {
        const row = personResult.rows.item(i) as Record<string, unknown>;
        results.push({
          id: `person-${row.id}`,
          entityType: 'person',
          entityId: row.id as string,
          title: `${row.first_name} ${row.last_name}`,
          subtitle: [
            row.date_of_death ? `Died: ${this.formatDate(row.date_of_death as number)}` : null,
            row.section_name ? `Section: ${row.section_name}` : null,
            row.plot_number ? `Plot: ${row.plot_number}` : null,
          ].filter(Boolean).join(' · '),
          rank: row.rank as number,
          extra: {
            gpsLat: row.gps_lat,
            gpsLng: row.gps_lng,
          },
        });
      }
    }

    if (types.includes('grave')) {
      const graveResult = this.db.execute(
        `SELECT
           g.id,
           g.grave_number,
           g.gps_lat,
           g.gps_lng,
           g.status,
           s.name as section_name,
           pl.plot_number,
           p.first_name,
           p.last_name,
           CASE
             WHEN g.grave_number LIKE ? THEN 3
             WHEN p.first_name LIKE ? THEN 2
             WHEN p.last_name LIKE ? THEN 2
             ELSE 1
           END as rank
         FROM graves g
         LEFT JOIN sections s ON s.id = g.section_id AND s.deleted_at IS NULL
         LEFT JOIN plots pl ON pl.id = g.plot_id AND pl.deleted_at IS NULL
         LEFT JOIN persons p ON p.grave_id = g.id AND p.deleted_at IS NULL
         WHERE g.deleted_at IS NULL
           AND (g.grave_number LIKE ? OR g.notes LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?)
         GROUP BY g.id
         ORDER BY rank DESC, g.grave_number
         LIMIT ?`,
        [like, like, like, like, like, like, like, limit]
      );
      for (let i = 0; i < graveResult.rows.length; i++) {
        const row = graveResult.rows.item(i) as Record<string, unknown>;
        const names = [row.first_name, row.last_name].filter(Boolean).join(' ');
        results.push({
          id: `grave-${row.id}`,
          entityType: 'grave',
          entityId: row.id as string,
          title: names || `Grave ${row.grave_number || row.id}`,
          subtitle: [
            row.section_name ? `Section: ${row.section_name}` : null,
            row.plot_number ? `Plot: ${row.plot_number}` : null,
            row.status ? `Status: ${row.status}` : null,
          ].filter(Boolean).join(' · '),
          rank: row.rank as number,
          extra: {
            gpsLat: row.gps_lat,
            gpsLng: row.gps_lng,
          },
        });
      }
    }

    if (types.includes('plot')) {
      const plotResult = this.db.execute(
        `SELECT
           pl.id,
           pl.plot_number,
           pl.status,
           pl.center_lat,
           pl.center_lng,
           s.name as section_name,
           CASE
             WHEN pl.plot_number LIKE ? THEN 3
             ELSE 1
           END as rank
         FROM plots pl
         LEFT JOIN sections s ON s.id = pl.section_id AND s.deleted_at IS NULL
         WHERE pl.deleted_at IS NULL
           AND (pl.plot_number LIKE ? OR pl.notes LIKE ?)
         ORDER BY rank DESC, pl.plot_number
         LIMIT ?`,
        [like, like, like, limit]
      );
      for (let i = 0; i < plotResult.rows.length; i++) {
        const row = plotResult.rows.item(i) as Record<string, unknown>;
        results.push({
          id: `plot-${row.id}`,
          entityType: 'plot',
          entityId: row.id as string,
          title: `Plot ${row.plot_number}`,
          subtitle: [
            row.section_name ? `Section: ${row.section_name}` : null,
            row.status ? `Status: ${row.status}` : null,
          ].filter(Boolean).join(' · '),
          rank: row.rank as number,
          extra: {
            centerLat: row.center_lat,
            centerLng: row.center_lng,
          },
        });
      }
    }

    // Sort combined results by rank descending
    results.sort((a, b) => b.rank - a.rank);
    return results.slice(0, limit);
  }

  private formatDate(ts: number): string {
    try {
      return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return String(ts);
    }
  }
}
