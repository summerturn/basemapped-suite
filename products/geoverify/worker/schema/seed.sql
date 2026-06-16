-- Sample data for GeoVerify demo dashboard
INSERT INTO projects (id, name, tests, last_run, status) VALUES
('proj_001', 'City Pipeline Network', 48, '2 hours ago', 'Passing'),
('proj_002', 'County Parcels', 112, '5 hours ago', 'Passing'),
('proj_003', 'Utility Pole Inventory', 36, '1 day ago', 'Failed');

INSERT INTO runs (id, run_id, project, duration, result, tests) VALUES
('run_001', 'RUN-9821', 'City Pipeline Network', '12s', 'Passed', '48/48'),
('run_002', 'RUN-9820', 'Utility Pole Inventory', '8s', 'Failed', '34/36'),
('run_003', 'RUN-9819', 'County Parcels', '22s', 'Passed', '112/112');

INSERT INTO assertions (id, name, category, usage) VALUES
('asrt_001', 'assert_geometry_is_valid', 'Geometry', 'assert geom.is_valid'),
('asrt_002', 'assert_same_crs', 'CRS', 'assert same_crs(a, b)'),
('asrt_003', 'assert_no_self_intersection', 'Topology', 'assert not geom.is_ring');
