import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('compliance_samples').del();
  await knex('compliance_service_lines').del();
  await knex('crew_schedules').del();
  await knex('work_orders').del();
  await knex('inspections').del();
  await knex('inspection_templates').del();
  await knex('asset_photos').del();
  await knex('assets').del();
  await knex('asset_types').del();
  await knex('users').del();
  await knex('utilities').del();

  const [utility] = await knex('utilities').insert({
    name: 'Maplewood Water District',
    pwsid: 'IN1234567',
    utility_type: 'community_water',
    population_served: 4500,
    address: '123 Main Street',
    city: 'Maplewood',
    state: 'IN',
    zip: '46001',
    county: 'Harrison',
    contact_phone: '(812) 555-0100',
    contact_email: 'admin@maplewoodwater.gov',
  }).returning('id');

  const utilityId = utility.id;

  const [admin, inspector1, field1] = await knex('users').insert([
    { utility_id: utilityId, email: 'admin@maplewoodwater.gov', password_hash: '$2a$10$hashed', first_name: 'John', last_name: 'Admin', role: 'utility_admin' },
    { utility_id: utilityId, email: 'inspector@maplewoodwater.gov', password_hash: '$2a$10$hashed', first_name: 'Jane', last_name: 'Inspector', role: 'inspector' },
    { utility_id: utilityId, email: 'field@maplewoodwater.gov', password_hash: '$2a$10$hashed', first_name: 'Bob', last_name: 'Field', role: 'field_user' },
  ]).returning('id');

  const assetTypes = await knex('asset_types').insert([
    { utility_id: utilityId, type_key: 'water_main', label: 'Water Main', geometry_type: 'line', color_hex: '#0C4A6E' },
    { utility_id: utilityId, type_key: 'valve', label: 'Valve', geometry_type: 'point', color_hex: '#F59E0B' },
    { utility_id: utilityId, type_key: 'hydrant', label: 'Hydrant', geometry_type: 'point', color_hex: '#DC2626' },
    { utility_id: utilityId, type_key: 'manhole', label: 'Manhole', geometry_type: 'point', color_hex: '#374151' },
    { utility_id: utilityId, type_key: 'meter', label: 'Water Meter', geometry_type: 'point', color_hex: '#10B981' },
    { utility_id: utilityId, type_key: 'service_line', label: 'Service Line', geometry_type: 'line', color_hex: '#6366F1' },
    { utility_id: utilityId, type_key: 'pump_station', label: 'Pump Station', geometry_type: 'polygon', color_hex: '#8B5CF6' },
    { utility_id: utilityId, type_key: 'storage_tank', label: 'Storage Tank', geometry_type: 'polygon', color_hex: '#06B6D4' },
  ]).returning('id');

  const typeMap: Record<string, string> = {};
  for (const t of assetTypes) {
    const row = await knex('asset_types').where('id', t.id).first();
    typeMap[row.type_key] = t.id;
  }

  // 50 sample assets around Lat 40.0, Lon -85.0
  const assetData = [];
  const types = ['water_main', 'valve', 'hydrant', 'manhole', 'meter', 'service_line', 'pump_station', 'storage_tank'];
  for (let i = 0; i < 50; i++) {
    const lat = 40.0 + (Math.random() - 0.5) * 0.05;
    const lon = -85.0 + (Math.random() - 0.5) * 0.05;
    const typeKey = types[i % types.length];
    assetData.push({
      utility_id: utilityId,
      asset_type_id: typeMap[typeKey],
      external_id: `ASSET-${1000 + i}`,
      geometry: knex.raw(`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)`),
      attributes: JSON.stringify({ manufacturer: 'Acme Corp', model: `Model-${i % 5}` }),
      status: ['active', 'active', 'active', 'under_repair', 'inactive'][i % 5],
      condition_rating: (i % 5) + 1,
      install_date: new Date(1980 + (i % 40), (i % 12), 1),
      material: ['PVC', 'Ductile Iron', 'Steel', 'Copper', 'Concrete'][i % 5],
      address: `${100 + i} Maple St`,
      created_by: admin.id,
    });
  }
  await knex('assets').insert(assetData);

  const assets = await knex('assets').where('utility_id', utilityId).select('id');

  await knex('inspection_templates').insert([
    { utility_id: utilityId, asset_type_id: typeMap['hydrant'], name: 'Hydrant Annual Inspection', form_schema_json: JSON.stringify({ fields: [{ name: 'flow_rate', type: 'number', required: true }, { name: 'pressure', type: 'number' }, { name: 'condition', type: 'select', options: ['good', 'fair', 'poor'] }] }), frequency_days: 365, is_default: true },
    { utility_id: utilityId, asset_type_id: typeMap['valve'], name: 'Valve Exercise', form_schema_json: JSON.stringify({ fields: [{ name: 'turns', type: 'number' }, { name: 'leaking', type: 'checkbox' }] }), frequency_days: 180 },
  ]);

  const templates = await knex('inspection_templates').where('utility_id', utilityId).select('id');

  for (let i = 0; i < 10; i++) {
    await knex('inspections').insert({
      asset_id: assets[i % assets.length].id,
      template_id: templates[i % templates.length]?.id || null,
      inspection_type: ['annual', 'quarterly', 'emergency'][i % 3],
      inspector_id: inspector1.id,
      scheduled_date: new Date(2026, (i % 12), 1 + (i % 28)),
      results_json: JSON.stringify({ flow_rate: 500 + i * 10, pressure: 45 + i, condition: ['good', 'fair', 'poor'][i % 3] }),
      status: ['scheduled', 'completed', 'completed', 'in_progress', 'overdue'][i % 5],
      notes: `Routine inspection #${i + 1}`,
    });
  }

  const crews = await knex('crews').insert({
    utility_id: utilityId,
    name: 'Crew A - North',
    supervisor_id: field1.id,
    member_ids: [field1.id],
    active: true,
  }).returning('id');

  for (let i = 0; i < 8; i++) {
    await knex('work_orders').insert({
      utility_id: utilityId,
      asset_id: assets[i % assets.length].id,
      title: `Repair work order #${i + 1}`,
      description: `Scheduled maintenance for asset ${1000 + i}`,
      priority: ['emergency', 'high', 'medium', 'low'][i % 4],
      status: ['open', 'assigned', 'in_progress', 'completed', 'open', 'open', 'closed', 'verified'][i],
      assigned_crew_id: crews[0].id,
      assigned_user_id: field1.id,
      labor_hours: 2 + i * 0.5,
      created_by: admin.id,
    });
  }

  const leadStatuses = ['lead', 'lead', 'non_lead', 'unknown', 'galvanized_requiring_replacement', 'non_lead', 'lead', 'unknown', 'non_lead', 'unknown', 'lead', 'non_lead', 'unknown', 'non_lead', 'lead', 'unknown', 'non_lead', 'non_lead', 'unknown', 'lead'];
  for (let i = 0; i < 20; i++) {
    await knex('compliance_service_lines').insert({
      utility_id: utilityId,
      address: `${100 + i} Oak Street`,
      customer_name: `Customer ${i + 1}`,
      lead_status: leadStatuses[i],
      sampling_site_tier: ['tier1', 'tier2', 'tier3'][i % 3],
      last_sample_date: new Date(2025, (i % 12), 15),
      sample_result_pb_ppb: [2.5, 4.0, 18.5, 3.2, 1.8, 22.0, 5.5, 2.0, 1.2, 3.8, 15.0, 2.1, 4.5, 1.0, 20.0, 3.0, 2.8, 1.5, 4.2, 25.0][i],
    });
  }

  const serviceLines = await knex('compliance_service_lines').where('utility_id', utilityId).select('id');
  for (let i = 0; i < 12; i++) {
    await knex('compliance_samples').insert({
      utility_id: utilityId,
      service_line_id: serviceLines[i % serviceLines.length].id,
      sample_date: new Date(2025, (i % 12), 1 + (i * 2)),
      lead_result_ppb: [2.5, 4.0, 18.5, 3.2, 1.8, 22.0, 5.5, 2.0, 1.2, 3.8, 15.0, 25.0][i],
      copper_result_ppm: [0.3, 0.5, 0.8, 0.2, 0.4, 1.2, 0.6, 0.3, 0.2, 0.5, 0.9, 1.5][i],
      action_level_exceeded: [2.5, 4.0, 18.5, 3.2, 1.8, 22.0, 5.5, 2.0, 1.2, 3.8, 15.0, 25.0][i] > 15,
    });
  }
}
