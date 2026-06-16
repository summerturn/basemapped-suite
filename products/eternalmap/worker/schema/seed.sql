-- Sample data for EternalMap demo dashboard
INSERT INTO plots (id, plot_id, section, status, occupant, deed) VALUES
('plot_001', 'A-1042', 'A', 'Occupied', 'John Miller', 'D-2011'),
('plot_002', 'B-0214', 'B', 'Available', '-', '-'),
('plot_003', 'C-0089', 'C', 'Occupied', 'Margaret Chen', 'D-2045'),
('plot_004', 'A-1043', 'A', 'Reserved', 'Miller Family', 'D-2012');

INSERT INTO deeds (id, deed_id, owner, plot, issued, status) VALUES
('deed_001', 'D-2045', 'Margaret Chen', 'C-0089', '2019-03-12', 'Active'),
('deed_002', 'D-2011', 'Robert Miller', 'A-1042', '2015-08-22', 'Active'),
('deed_003', 'D-2012', 'Miller Family', 'A-1043', '2024-01-10', 'Active');

INSERT INTO families (id, name, members, plots, portal) VALUES
('fam_001', 'Miller Family', 4, 'A-1042, A-1043', 'Active'),
('fam_002', 'Chen Family', 2, 'C-0089', 'Active');
