-- ============================================
-- MERIDIAN BANK - SEED DATA
-- Add missing columns and seed data
-- ============================================

-- Fix bronze_loans table - add missing columns if they don't exist
DO $$
BEGIN
    -- Add columns to bronze_loans if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'meridian' AND table_name = 'bronze_loans' AND column_name = 'product_id') THEN
        ALTER TABLE meridian.bronze_loans ADD COLUMN product_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'meridian' AND table_name = 'bronze_loans' AND column_name = 'source_file') THEN
        ALTER TABLE meridian.bronze_loans ADD COLUMN source_file TEXT;
    END IF;

    -- Add columns to bronze_customers if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'meridian' AND table_name = 'bronze_customers' AND column_name = 'source_file') THEN
        ALTER TABLE meridian.bronze_customers ADD COLUMN source_file TEXT;
    END IF;

    -- Add columns to bronze_transactions if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'meridian' AND table_name = 'bronze_transactions' AND column_name = 'source_file') THEN
        ALTER TABLE meridian.bronze_transactions ADD COLUMN source_file TEXT;
    END IF;

    -- Add columns to bronze_accounts if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'meridian' AND table_name = 'bronze_accounts' AND column_name = 'source_file') THEN
        ALTER TABLE meridian.bronze_accounts ADD COLUMN source_file TEXT;
    END IF;
END $$;

-- Reference Data: Customer Segments
INSERT INTO meridian.ref_customer_segments (segment_id, segment_name, description, priority) VALUES
('SEG001', 'Premium', 'High-value customers with >$100k in assets', 1),
('SEG002', 'Standard', 'Regular banking customers', 2),
('SEG003', 'Student', 'Students and young professionals', 3),
('SEG004', 'Business', 'Small business owners', 1),
('SEG005', 'Retirement', 'Retirees and pension accounts', 2)
ON CONFLICT (segment_id) DO NOTHING;

-- Reference Data: Branches
INSERT INTO meridian.ref_branches (branch_id, branch_name, region, city, state, manager_name, opened_date, status) VALUES
('BR001', 'Downtown Manhattan', 'East', 'New York', 'NY', 'Sarah Johnson', '2015-01-15', 'active'),
('BR002', 'Silicon Valley', 'West', 'San Jose', 'CA', 'Mike Chen', '2016-03-20', 'active'),
('BR003', 'Chicago Loop', 'Central', 'Chicago', 'IL', 'Emily Davis', '2014-06-10', 'active'),
('BR004', 'Miami Beach', 'South', 'Miami', 'FL', 'Carlos Rodriguez', '2017-09-01', 'active'),
('BR005', 'Seattle Central', 'West', 'Seattle', 'WA', 'Amanda Smith', '2018-02-28', 'active'),
('BR006', 'Boston Financial', 'East', 'Boston', 'MA', 'James Wilson', '2013-11-15', 'active'),
('BR007', 'Dallas Uptown', 'South', 'Dallas', 'TX', 'Maria Garcia', '2019-04-22', 'active'),
('BR008', 'Denver Heights', 'Central', 'Denver', 'CO', 'Robert Brown', '2020-01-10', 'active')
ON CONFLICT (branch_id) DO NOTHING;

-- Reference Data: Products
INSERT INTO meridian.ref_products (product_id, product_name, product_category, interest_rate, is_active) VALUES
('PROD001', 'Basic Checking', 'checking', 0.00, true),
('PROD002', 'Premium Checking', 'checking', 0.10, true),
('PROD003', 'High-Yield Savings', 'savings', 4.25, true),
('PROD004', 'Personal Loan', 'loan', 8.99, true),
('PROD005', 'Home Mortgage', 'mortgage', 6.75, true),
('PROD006', 'Auto Loan', 'loan', 5.99, true),
('PROD007', 'Platinum Credit Card', 'credit_card', 19.99, true),
('PROD008', 'Investment Portfolio', 'investment', NULL, true)
ON CONFLICT (product_id) DO NOTHING;

-- Bronze Layer: Customers (raw data with some inconsistencies)
INSERT INTO meridian.bronze_customers (customer_id, first_name, last_name, email, phone, address, city, state, zip_code, date_of_birth, segment_id) VALUES
('C001', 'John', 'Smith', 'john.smith@email.com', '(212) 555-0101', '123 Main St', 'New York', 'NY', '10001', '1985-03-15', 'SEG001'),
('C002', 'Emily', 'Johnson', 'emily.j@gmail.com', '415-555-0202', '456 Oak Ave', 'San Francisco', 'CA', '94102', '1990-07-22', 'SEG002'),
('C003', 'Michael', 'Williams', 'mwilliams@work.com', '312.555.0303', '789 Elm St', 'Chicago', 'IL', '60601', '1978-11-08', 'SEG004'),
('C004', 'Sarah', 'Brown', 'sbrown123@yahoo.com', '305-555-0404', '321 Palm Dr', 'Miami', 'FL', '33101', '1995-02-28', 'SEG003'),
('C005', 'David', 'Garcia', 'dgarcia@company.org', '206 555 0505', '555 Pine Rd', 'Seattle', 'WA', '98101', '1982-09-12', 'SEG001'),
('C006', 'Jennifer', 'Martinez', 'jen.martinez@email.com', '617-555-0606', '888 Maple Ln', 'Boston', 'MA', '02101', '1988-05-30', 'SEG002'),
('C007', 'Robert', 'Anderson', 'r.anderson@mail.com', '214-555-0707', '999 Cedar Blvd', 'Dallas', 'TX', '75201', '1965-12-03', 'SEG005'),
('C008', 'Lisa', 'Taylor', 'lisa.t@inbox.com', '303-555-0808', '111 Birch Ave', 'Denver', 'CO', '80201', '1992-08-17', 'SEG002'),
('C009', 'James', 'Thomas', 'jthomas@email.net', '212-555-0909', '222 Oak St', 'New York', 'NY', '10002', '1975-04-25', 'SEG004'),
('C010', 'Amanda', 'Jackson', 'amandaj@gmail.com', '415-555-1010', '333 Walnut Dr', 'San Jose', 'CA', '95101', '1998-01-14', 'SEG003'),
('C011', 'William', 'White', 'wwhite@company.com', '312-555-1111', '444 Ash Ln', 'Chicago', 'IL', '60602', '1970-06-20', 'SEG001'),
('C012', 'Jessica', 'Harris', 'jharris@work.org', '305-555-1212', '555 Beach Rd', 'Miami', 'FL', '33102', '1987-10-05', 'SEG002'),
('C013', 'Daniel', 'Clark', NULL, '206-555-1313', '666 Mountain Way', 'Seattle', 'WA', '98102', '1993-03-18', 'SEG002'),
('C014', 'Michelle', 'Lewis', 'invalid-email', '617-555-1414', '777 Harbor St', 'Boston', 'MA', '02102', '1980-11-30', 'SEG004'),
('C015', 'Christopher', 'Walker', 'cwalker@email.com', NULL, '888 Valley Blvd', 'Dallas', 'TX', '75202', '1968-07-12', 'SEG005')
ON CONFLICT (customer_id) DO NOTHING;

-- Bronze Layer: Accounts
INSERT INTO meridian.bronze_accounts (account_id, customer_id, account_type, balance, opened_date, status, branch_id) VALUES
('A001', 'C001', 'checking', 15420.50, '2020-01-15', 'active', 'BR001'),
('A002', 'C001', 'savings', 52000.00, '2020-01-15', 'active', 'BR001'),
('A003', 'C002', 'checking', 3250.75, '2021-03-20', 'active', 'BR002'),
('A004', 'C003', 'checking', 8900.00, '2019-06-10', 'active', 'BR003'),
('A005', 'C003', 'savings', 125000.00, '2019-06-10', 'active', 'BR003'),
('A006', 'C004', 'checking', 1520.25, '2022-09-01', 'active', 'BR004'),
('A007', 'C005', 'checking', 28450.00, '2018-02-28', 'active', 'BR005'),
('A008', 'C005', 'savings', 180000.00, '2018-02-28', 'active', 'BR005'),
('A009', 'C006', 'checking', 5620.80, '2020-11-15', 'active', 'BR006'),
('A010', 'C007', 'savings', 95000.00, '2015-04-22', 'active', 'BR007'),
('A011', 'C008', 'checking', 4100.00, '2023-01-10', 'active', 'BR008'),
('A012', 'C009', 'checking', 22500.00, '2017-07-05', 'active', 'BR001'),
('A013', 'C010', 'checking', 890.50, '2023-08-15', 'active', 'BR002'),
('A014', 'C011', 'checking', 45000.00, '2016-02-20', 'active', 'BR003'),
('A015', 'C011', 'savings', 350000.00, '2016-02-20', 'active', 'BR003'),
('A016', 'C012', 'checking', 7800.25, '2021-05-30', 'active', 'BR004'),
('A017', 'C013', 'checking', 2100.00, '2022-12-01', 'active', 'BR005'),
('A018', 'C014', 'checking', 18500.00, '2019-09-18', 'active', 'BR006'),
('A019', 'C015', 'savings', 75000.00, '2014-03-25', 'active', 'BR007'),
('A020', 'C015', 'checking', -250.00, '2014-03-25', 'overdrawn', 'BR007')
ON CONFLICT (account_id) DO NOTHING;

-- Bronze Layer: Transactions
INSERT INTO meridian.bronze_transactions (transaction_id, account_id, transaction_date, amount, transaction_type, branch_id, description) VALUES
('T001', 'A001', '2024-01-15', 2500.00, 'deposit', 'BR001', 'Payroll deposit'),
('T002', 'A001', '2024-01-16', -150.00, 'withdrawal', 'BR001', 'ATM withdrawal'),
('T003', 'A002', '2024-01-17', 1000.00, 'transfer', 'BR001', 'Transfer from checking'),
('T004', 'A003', '2024-01-18', 3200.00, 'deposit', 'BR002', 'Direct deposit'),
('T005', 'A003', '2024-01-19', -89.99, 'payment', 'BR002', 'Online payment'),
('T006', 'A004', '2024-01-20', -500.00, 'withdrawal', 'BR003', 'Branch withdrawal'),
('T007', 'A005', '2024-01-21', 5000.00, 'deposit', 'BR003', 'Business deposit'),
('T008', 'A006', '2024-01-22', 1200.00, 'deposit', 'BR004', 'Mobile deposit'),
('T009', 'A007', '2024-01-23', -350.00, 'payment', 'BR005', 'Bill payment'),
('T010', 'A008', '2024-01-24', 10000.00, 'deposit', 'BR005', 'Wire transfer'),
('T011', 'A009', '2024-01-25', 2800.00, 'deposit', 'BR006', 'Payroll'),
('T012', 'A010', '2024-01-26', -1500.00, 'withdrawal', 'BR007', 'ATM withdrawal'),
('T013', 'A011', '2024-01-27', 1500.00, 'deposit', 'BR008', 'Transfer in'),
('T014', 'A012', '2024-01-28', -200.00, 'payment', 'BR001', 'Utility payment'),
('T015', 'A013', '2024-01-29', 500.00, 'deposit', 'BR002', 'Cash deposit'),
('T016', 'A014', '2024-01-30', -2500.00, 'withdrawal', 'BR003', 'Wire transfer out'),
('T017', 'A015', '2024-01-31', 8000.00, 'deposit', 'BR003', 'Investment return'),
('T018', 'A016', '2024-02-01', 3500.00, 'deposit', 'BR004', 'Direct deposit'),
('T019', 'A017', '2024-02-02', -75.00, 'payment', 'BR005', 'Subscription'),
('T020', 'A018', '2024-02-03', 4200.00, 'deposit', 'BR006', 'Payroll'),
('T021', 'A019', '2024-02-04', 2000.00, 'deposit', 'BR007', 'Transfer'),
('T022', 'A020', '2024-02-05', -300.00, 'withdrawal', 'BR007', 'ATM'),
('T023', 'A001', '2024-02-06', 2500.00, 'deposit', 'BR001', 'Payroll'),
('T024', 'A002', '2024-02-07', -1000.00, 'transfer', 'BR001', 'Transfer to checking'),
('T025', 'A003', '2024-02-08', -250.00, 'payment', 'BR002', 'Credit card payment')
ON CONFLICT (transaction_id) DO NOTHING;

-- Bronze Layer: Loans (without source_file and product_id for compatibility)
INSERT INTO meridian.bronze_loans (loan_id, customer_id, principal_amount, interest_rate, term_months, start_date, maturity_date, collateral_value, status) VALUES
('L001', 'C001', 350000.00, 6.50, 360, '2020-06-01', '2050-06-01', 450000.00, 'active'),
('L002', 'C003', 25000.00, 8.99, 60, '2023-03-15', '2028-03-15', NULL, 'active'),
('L003', 'C005', 500000.00, 6.25, 360, '2019-08-01', '2049-08-01', 650000.00, 'active'),
('L004', 'C007', 35000.00, 5.50, 48, '2022-01-10', '2026-01-10', 42000.00, 'active'),
('L005', 'C009', 50000.00, 9.50, 72, '2021-05-20', '2027-05-20', NULL, 'active'),
('L006', 'C011', 750000.00, 6.75, 360, '2018-11-01', '2048-11-01', 950000.00, 'active'),
('L007', 'C014', 15000.00, 10.99, 36, '2023-09-01', '2026-09-01', NULL, 'active'),
('L008', 'C002', 28000.00, 5.25, 60, '2024-01-15', '2029-01-15', 32000.00, 'active'),
('L009', 'C006', 10000.00, 8.50, 24, '2023-06-01', '2025-06-01', NULL, 'paid_off'),
('L010', 'C012', 280000.00, 7.00, 360, '2022-04-01', '2052-04-01', 320000.00, 'delinquent')
ON CONFLICT (loan_id) DO NOTHING;

-- Silver Layer: Cleaned Customers
INSERT INTO meridian.silver_customers (customer_id, full_name, first_name, last_name, email, email_valid, phone, phone_valid, phone_normalized, address_full, city, state, zip_code, date_of_birth, age, segment_id, segment_name) VALUES
('C001', 'John Smith', 'John', 'Smith', 'john.smith@email.com', true, '(212) 555-0101', true, '+12125550101', '123 Main St', 'New York', 'NY', '10001', '1985-03-15', 39, 'SEG001', 'Premium'),
('C002', 'Emily Johnson', 'Emily', 'Johnson', 'emily.j@gmail.com', true, '415-555-0202', true, '+14155550202', '456 Oak Ave', 'San Francisco', 'CA', '94102', '1990-07-22', 33, 'SEG002', 'Standard'),
('C003', 'Michael Williams', 'Michael', 'Williams', 'mwilliams@work.com', true, '312.555.0303', true, '+13125550303', '789 Elm St', 'Chicago', 'IL', '60601', '1978-11-08', 45, 'SEG004', 'Business'),
('C004', 'Sarah Brown', 'Sarah', 'Brown', 'sbrown123@yahoo.com', true, '305-555-0404', true, '+13055550404', '321 Palm Dr', 'Miami', 'FL', '33101', '1995-02-28', 28, 'SEG003', 'Student'),
('C005', 'David Garcia', 'David', 'Garcia', 'dgarcia@company.org', true, '206 555 0505', true, '+12065550505', '555 Pine Rd', 'Seattle', 'WA', '98101', '1982-09-12', 41, 'SEG001', 'Premium'),
('C006', 'Jennifer Martinez', 'Jennifer', 'Martinez', 'jen.martinez@email.com', true, '617-555-0606', true, '+16175550606', '888 Maple Ln', 'Boston', 'MA', '02101', '1988-05-30', 35, 'SEG002', 'Standard'),
('C007', 'Robert Anderson', 'Robert', 'Anderson', 'r.anderson@mail.com', true, '214-555-0707', true, '+12145550707', '999 Cedar Blvd', 'Dallas', 'TX', '75201', '1965-12-03', 58, 'SEG005', 'Retirement'),
('C008', 'Lisa Taylor', 'Lisa', 'Taylor', 'lisa.t@inbox.com', true, '303-555-0808', true, '+13035550808', '111 Birch Ave', 'Denver', 'CO', '80201', '1992-08-17', 31, 'SEG002', 'Standard'),
('C009', 'James Thomas', 'James', 'Thomas', 'jthomas@email.net', true, '212-555-0909', true, '+12125550909', '222 Oak St', 'New York', 'NY', '10002', '1975-04-25', 48, 'SEG004', 'Business'),
('C010', 'Amanda Jackson', 'Amanda', 'Jackson', 'amandaj@gmail.com', true, '415-555-1010', true, '+14155551010', '333 Walnut Dr', 'San Jose', 'CA', '95101', '1998-01-14', 26, 'SEG003', 'Student'),
('C011', 'William White', 'William', 'White', 'wwhite@company.com', true, '312-555-1111', true, '+13125551111', '444 Ash Ln', 'Chicago', 'IL', '60602', '1970-06-20', 53, 'SEG001', 'Premium'),
('C012', 'Jessica Harris', 'Jessica', 'Harris', 'jharris@work.org', true, '305-555-1212', true, '+13055551212', '555 Beach Rd', 'Miami', 'FL', '33102', '1987-10-05', 36, 'SEG002', 'Standard'),
('C013', 'Daniel Clark', 'Daniel', 'Clark', NULL, false, '206-555-1313', true, '+12065551313', '666 Mountain Way', 'Seattle', 'WA', '98102', '1993-03-18', 30, 'SEG002', 'Standard'),
('C014', 'Michelle Lewis', 'Michelle', 'Lewis', NULL, false, '617-555-1414', true, '+16175551414', '777 Harbor St', 'Boston', 'MA', '02102', '1980-11-30', 43, 'SEG004', 'Business'),
('C015', 'Christopher Walker', 'Christopher', 'Walker', 'cwalker@email.com', true, NULL, false, NULL, '888 Valley Blvd', 'Dallas', 'TX', '75202', '1968-07-12', 55, 'SEG005', 'Retirement')
ON CONFLICT (customer_id) DO NOTHING;

-- Silver Layer: Cleaned Transactions
INSERT INTO meridian.silver_transactions (transaction_id, account_id, customer_id, transaction_date, amount, transaction_type, branch_id, branch_name, region, description) VALUES
('T001', 'A001', 'C001', '2024-01-15', 2500.00, 'deposit', 'BR001', 'Downtown Manhattan', 'East', 'Payroll deposit'),
('T002', 'A001', 'C001', '2024-01-16', -150.00, 'withdrawal', 'BR001', 'Downtown Manhattan', 'East', 'ATM withdrawal'),
('T003', 'A002', 'C001', '2024-01-17', 1000.00, 'transfer', 'BR001', 'Downtown Manhattan', 'East', 'Transfer from checking'),
('T004', 'A003', 'C002', '2024-01-18', 3200.00, 'deposit', 'BR002', 'Silicon Valley', 'West', 'Direct deposit'),
('T005', 'A003', 'C002', '2024-01-19', -89.99, 'payment', 'BR002', 'Silicon Valley', 'West', 'Online payment'),
('T006', 'A004', 'C003', '2024-01-20', -500.00, 'withdrawal', 'BR003', 'Chicago Loop', 'Central', 'Branch withdrawal'),
('T007', 'A005', 'C003', '2024-01-21', 5000.00, 'deposit', 'BR003', 'Chicago Loop', 'Central', 'Business deposit'),
('T008', 'A006', 'C004', '2024-01-22', 1200.00, 'deposit', 'BR004', 'Miami Beach', 'South', 'Mobile deposit'),
('T009', 'A007', 'C005', '2024-01-23', -350.00, 'payment', 'BR005', 'Seattle Central', 'West', 'Bill payment'),
('T010', 'A008', 'C005', '2024-01-24', 10000.00, 'deposit', 'BR005', 'Seattle Central', 'West', 'Wire transfer'),
('T011', 'A009', 'C006', '2024-01-25', 2800.00, 'deposit', 'BR006', 'Boston Financial', 'East', 'Payroll'),
('T012', 'A010', 'C007', '2024-01-26', -1500.00, 'withdrawal', 'BR007', 'Dallas Uptown', 'South', 'ATM withdrawal'),
('T013', 'A011', 'C008', '2024-01-27', 1500.00, 'deposit', 'BR008', 'Denver Heights', 'Central', 'Transfer in'),
('T014', 'A012', 'C009', '2024-01-28', -200.00, 'payment', 'BR001', 'Downtown Manhattan', 'East', 'Utility payment'),
('T015', 'A013', 'C010', '2024-01-29', 500.00, 'deposit', 'BR002', 'Silicon Valley', 'West', 'Cash deposit'),
('T016', 'A014', 'C011', '2024-01-30', -2500.00, 'withdrawal', 'BR003', 'Chicago Loop', 'Central', 'Wire transfer out'),
('T017', 'A015', 'C011', '2024-01-31', 8000.00, 'deposit', 'BR003', 'Chicago Loop', 'Central', 'Investment return'),
('T018', 'A016', 'C012', '2024-02-01', 3500.00, 'deposit', 'BR004', 'Miami Beach', 'South', 'Direct deposit'),
('T019', 'A017', 'C013', '2024-02-02', -75.00, 'payment', 'BR005', 'Seattle Central', 'West', 'Subscription'),
('T020', 'A018', 'C014', '2024-02-03', 4200.00, 'deposit', 'BR006', 'Boston Financial', 'East', 'Payroll'),
('T021', 'A019', 'C015', '2024-02-04', 2000.00, 'deposit', 'BR007', 'Dallas Uptown', 'South', 'Transfer'),
('T022', 'A020', 'C015', '2024-02-05', -300.00, 'withdrawal', 'BR007', 'Dallas Uptown', 'South', 'ATM'),
('T023', 'A001', 'C001', '2024-02-06', 2500.00, 'deposit', 'BR001', 'Downtown Manhattan', 'East', 'Payroll'),
('T024', 'A002', 'C001', '2024-02-07', -1000.00, 'transfer', 'BR001', 'Downtown Manhattan', 'East', 'Transfer to checking'),
('T025', 'A003', 'C002', '2024-02-08', -250.00, 'payment', 'BR002', 'Silicon Valley', 'West', 'Credit card payment')
ON CONFLICT (transaction_id) DO NOTHING;

-- Silver Layer: Cleaned Accounts
INSERT INTO meridian.silver_accounts (account_id, customer_id, customer_name, account_type, balance, opened_date, status, branch_id, branch_name) VALUES
('A001', 'C001', 'John Smith', 'checking', 17270.50, '2020-01-15', 'active', 'BR001', 'Downtown Manhattan'),
('A002', 'C001', 'John Smith', 'savings', 52000.00, '2020-01-15', 'active', 'BR001', 'Downtown Manhattan'),
('A003', 'C002', 'Emily Johnson', 'checking', 6060.76, '2021-03-20', 'active', 'BR002', 'Silicon Valley'),
('A004', 'C003', 'Michael Williams', 'checking', 8400.00, '2019-06-10', 'active', 'BR003', 'Chicago Loop'),
('A005', 'C003', 'Michael Williams', 'savings', 130000.00, '2019-06-10', 'active', 'BR003', 'Chicago Loop'),
('A006', 'C004', 'Sarah Brown', 'checking', 2720.25, '2022-09-01', 'active', 'BR004', 'Miami Beach'),
('A007', 'C005', 'David Garcia', 'checking', 28100.00, '2018-02-28', 'active', 'BR005', 'Seattle Central'),
('A008', 'C005', 'David Garcia', 'savings', 190000.00, '2018-02-28', 'active', 'BR005', 'Seattle Central'),
('A009', 'C006', 'Jennifer Martinez', 'checking', 8420.80, '2020-11-15', 'active', 'BR006', 'Boston Financial'),
('A010', 'C007', 'Robert Anderson', 'savings', 93500.00, '2015-04-22', 'active', 'BR007', 'Dallas Uptown'),
('A011', 'C008', 'Lisa Taylor', 'checking', 5600.00, '2023-01-10', 'active', 'BR008', 'Denver Heights'),
('A012', 'C009', 'James Thomas', 'checking', 22300.00, '2017-07-05', 'active', 'BR001', 'Downtown Manhattan'),
('A013', 'C010', 'Amanda Jackson', 'checking', 1390.50, '2023-08-15', 'active', 'BR002', 'Silicon Valley'),
('A014', 'C011', 'William White', 'checking', 42500.00, '2016-02-20', 'active', 'BR003', 'Chicago Loop'),
('A015', 'C011', 'William White', 'savings', 358000.00, '2016-02-20', 'active', 'BR003', 'Chicago Loop'),
('A016', 'C012', 'Jessica Harris', 'checking', 11300.25, '2021-05-30', 'active', 'BR004', 'Miami Beach'),
('A017', 'C013', 'Daniel Clark', 'checking', 2025.00, '2022-12-01', 'active', 'BR005', 'Seattle Central'),
('A018', 'C014', 'Michelle Lewis', 'checking', 22700.00, '2019-09-18', 'active', 'BR006', 'Boston Financial'),
('A019', 'C015', 'Christopher Walker', 'savings', 77000.00, '2014-03-25', 'active', 'BR007', 'Dallas Uptown'),
('A020', 'C015', 'Christopher Walker', 'checking', -550.00, '2014-03-25', 'overdrawn', 'BR007', 'Dallas Uptown')
ON CONFLICT (account_id) DO NOTHING;

-- Silver Layer: Cleaned Loans
INSERT INTO meridian.silver_loans (loan_id, customer_id, customer_name, product_id, product_name, principal_amount, current_balance, interest_rate, term_months, start_date, maturity_date, collateral_value, ltv_ratio, status, is_performing) VALUES
('L001', 'C001', 'John Smith', 'PROD005', 'Home Mortgage', 350000.00, 320000.00, 6.50, 360, '2020-06-01', '2050-06-01', 450000.00, 71.11, 'active', true),
('L002', 'C003', 'Michael Williams', 'PROD004', 'Personal Loan', 25000.00, 18500.00, 8.99, 60, '2023-03-15', '2028-03-15', NULL, NULL, 'active', true),
('L003', 'C005', 'David Garcia', 'PROD005', 'Home Mortgage', 500000.00, 480000.00, 6.25, 360, '2019-08-01', '2049-08-01', 650000.00, 73.85, 'active', true),
('L004', 'C007', 'Robert Anderson', 'PROD006', 'Auto Loan', 35000.00, 22000.00, 5.50, 48, '2022-01-10', '2026-01-10', 42000.00, 52.38, 'active', true),
('L005', 'C009', 'James Thomas', 'PROD004', 'Personal Loan', 50000.00, 38000.00, 9.50, 72, '2021-05-20', '2027-05-20', NULL, NULL, 'active', true),
('L006', 'C011', 'William White', 'PROD005', 'Home Mortgage', 750000.00, 710000.00, 6.75, 360, '2018-11-01', '2048-11-01', 950000.00, 74.74, 'active', true),
('L007', 'C014', 'Michelle Lewis', 'PROD004', 'Personal Loan', 15000.00, 12000.00, 10.99, 36, '2023-09-01', '2026-09-01', NULL, NULL, 'active', true),
('L008', 'C002', 'Emily Johnson', 'PROD006', 'Auto Loan', 28000.00, 27500.00, 5.25, 60, '2024-01-15', '2029-01-15', 32000.00, 85.94, 'active', true),
('L009', 'C006', 'Jennifer Martinez', 'PROD004', 'Personal Loan', 10000.00, 0.00, 8.50, 24, '2023-06-01', '2025-06-01', NULL, NULL, 'paid_off', true),
('L010', 'C012', 'Jessica Harris', 'PROD005', 'Home Mortgage', 280000.00, 275000.00, 7.00, 360, '2022-04-01', '2052-04-01', 320000.00, 85.94, 'delinquent', false)
ON CONFLICT (loan_id) DO NOTHING;

-- Gold Layer: Daily Revenue
INSERT INTO meridian.gold_daily_revenue (date, total_revenue, interest_income, fee_income, transaction_count, avg_transaction_value, revenue_target, variance_to_target, variance_percentage) VALUES
('2024-01-15', 152500.00, 125000.00, 27500.00, 45, 3388.89, 150000.00, 2500.00, 1.67),
('2024-01-16', 148200.00, 122000.00, 26200.00, 42, 3528.57, 150000.00, -1800.00, -1.20),
('2024-01-17', 165800.00, 138000.00, 27800.00, 52, 3188.46, 150000.00, 15800.00, 10.53),
('2024-01-18', 143500.00, 118000.00, 25500.00, 38, 3776.32, 150000.00, -6500.00, -4.33),
('2024-01-19', 158900.00, 132000.00, 26900.00, 48, 3310.42, 150000.00, 8900.00, 5.93),
('2024-01-22', 171200.00, 142000.00, 29200.00, 55, 3112.73, 150000.00, 21200.00, 14.13),
('2024-01-23', 145600.00, 120000.00, 25600.00, 40, 3640.00, 150000.00, -4400.00, -2.93),
('2024-01-24', 182400.00, 152000.00, 30400.00, 62, 2941.94, 150000.00, 32400.00, 21.60),
('2024-01-25', 156300.00, 130000.00, 26300.00, 47, 3325.53, 150000.00, 6300.00, 4.20),
('2024-01-26', 149800.00, 124000.00, 25800.00, 43, 3483.72, 150000.00, -200.00, -0.13)
ON CONFLICT (date) DO NOTHING;

-- Gold Layer: Branch Metrics
INSERT INTO meridian.gold_branch_metrics (date, branch_id, branch_name, region, transaction_count, total_amount, avg_transaction_value, customer_count) VALUES
('2024-01-31', 'BR001', 'Downtown Manhattan', 'East', 125, 3250000.00, 26000.00, 45),
('2024-01-31', 'BR002', 'Silicon Valley', 'West', 98, 2450000.00, 25000.00, 38),
('2024-01-31', 'BR003', 'Chicago Loop', 'Central', 112, 2980000.00, 26607.14, 42),
('2024-01-31', 'BR004', 'Miami Beach', 'South', 78, 1560000.00, 20000.00, 28),
('2024-01-31', 'BR005', 'Seattle Central', 'West', 95, 2375000.00, 25000.00, 35),
('2024-01-31', 'BR006', 'Boston Financial', 'East', 88, 2200000.00, 25000.00, 32),
('2024-01-31', 'BR007', 'Dallas Uptown', 'South', 72, 1440000.00, 20000.00, 25),
('2024-01-31', 'BR008', 'Denver Heights', 'Central', 65, 1300000.00, 20000.00, 22)
ON CONFLICT (date, branch_id) DO NOTHING;

-- Gold Layer: Loan Summary
INSERT INTO meridian.gold_loan_summary (date, total_loans_outstanding, total_loan_count, avg_loan_size, total_collateral_value, collateral_coverage_ratio, npl_amount, npl_count, npl_ratio, loans_by_product, loans_by_status) VALUES
('2024-01-31', 1903000.00, 10, 190300.00, 2444000.00, 1.28, 275000.00, 1, 14.45,
 '{"mortgage": 5, "personal_loan": 4, "auto_loan": 2}'::jsonb,
 '{"active": 8, "paid_off": 1, "delinquent": 1}'::jsonb)
ON CONFLICT (date) DO NOTHING;

-- Gold Layer: Customer 360
INSERT INTO meridian.gold_customer_360 (customer_id, full_name, email, email_valid, phone, phone_valid, segment_name, total_accounts, total_balance, total_loans, total_loan_balance, lifetime_transactions, lifetime_value, risk_score, last_transaction_date) VALUES
('C001', 'John Smith', 'john.smith@email.com', true, '(212) 555-0101', true, 'Premium', 2, 69270.50, 1, 320000.00, 45, 389270.50, 15, '2024-02-06'),
('C002', 'Emily Johnson', 'emily.j@gmail.com', true, '415-555-0202', true, 'Standard', 1, 6060.76, 1, 27500.00, 28, 33560.76, 25, '2024-02-08'),
('C003', 'Michael Williams', 'mwilliams@work.com', true, '312.555.0303', true, 'Business', 2, 138400.00, 1, 18500.00, 52, 156900.00, 20, '2024-01-21'),
('C004', 'Sarah Brown', 'sbrown123@yahoo.com', true, '305-555-0404', true, 'Student', 1, 2720.25, 0, 0.00, 12, 2720.25, 35, '2024-01-22'),
('C005', 'David Garcia', 'dgarcia@company.org', true, '206 555 0505', true, 'Premium', 2, 218100.00, 1, 480000.00, 68, 698100.00, 10, '2024-01-24'),
('C006', 'Jennifer Martinez', 'jen.martinez@email.com', true, '617-555-0606', true, 'Standard', 1, 8420.80, 1, 0.00, 35, 8420.80, 30, '2024-01-25'),
('C007', 'Robert Anderson', 'r.anderson@mail.com', true, '214-555-0707', true, 'Retirement', 1, 93500.00, 1, 22000.00, 25, 115500.00, 20, '2024-01-26'),
('C008', 'Lisa Taylor', 'lisa.t@inbox.com', true, '303-555-0808', true, 'Standard', 1, 5600.00, 0, 0.00, 15, 5600.00, 40, '2024-01-27'),
('C009', 'James Thomas', 'jthomas@email.net', true, '212-555-0909', true, 'Business', 1, 22300.00, 1, 38000.00, 42, 60300.00, 25, '2024-01-28'),
('C010', 'Amanda Jackson', 'amandaj@gmail.com', true, '415-555-1010', true, 'Student', 1, 1390.50, 0, 0.00, 8, 1390.50, 45, '2024-01-29'),
('C011', 'William White', 'wwhite@company.com', true, '312-555-1111', true, 'Premium', 2, 400500.00, 1, 710000.00, 85, 1110500.00, 5, '2024-01-31'),
('C012', 'Jessica Harris', 'jharris@work.org', true, '305-555-1212', true, 'Standard', 1, 11300.25, 1, 275000.00, 22, 286300.25, 55, '2024-02-01'),
('C013', 'Daniel Clark', NULL, false, '206-555-1313', true, 'Standard', 1, 2025.00, 0, 0.00, 10, 2025.00, 50, '2024-02-02'),
('C014', 'Michelle Lewis', NULL, false, '617-555-1414', true, 'Business', 1, 22700.00, 1, 12000.00, 38, 34700.00, 35, '2024-02-03'),
('C015', 'Christopher Walker', 'cwalker@email.com', true, NULL, false, 'Retirement', 2, 76450.00, 0, 0.00, 20, 76450.00, 60, '2024-02-05')
ON CONFLICT (customer_id) DO NOTHING;

-- Pipelines
INSERT INTO meridian.pipelines (id, name, description, source_table, target_table, schedule, is_active) VALUES
('PL001', 'bronze_to_silver_customers', 'Clean and validate customer data', 'meridian.bronze_customers', 'meridian.silver_customers', 'daily 02:00', true),
('PL002', 'bronze_to_silver_transactions', 'Enrich transactions with branch data', 'meridian.bronze_transactions', 'meridian.silver_transactions', 'hourly', true),
('PL003', 'bronze_to_silver_accounts', 'Clean account data and join customer info', 'meridian.bronze_accounts', 'meridian.silver_accounts', 'daily 02:30', true),
('PL004', 'bronze_to_silver_loans', 'Calculate LTV ratios and enrich loan data', 'meridian.bronze_loans', 'meridian.silver_loans', 'daily 03:00', true),
('PL005', 'silver_to_gold_daily_revenue', 'Aggregate daily revenue metrics', 'meridian.silver_transactions', 'meridian.gold_daily_revenue', 'daily 04:00', true),
('PL006', 'silver_to_gold_branch_metrics', 'Calculate branch-level KPIs', 'meridian.silver_transactions', 'meridian.gold_branch_metrics', 'daily 04:30', true),
('PL007', 'silver_to_gold_loan_summary', 'Aggregate loan portfolio metrics', 'meridian.silver_loans', 'meridian.gold_loan_summary', 'daily 05:00', true),
('PL008', 'silver_to_gold_customer_360', 'Build customer 360 view', 'meridian.silver_customers', 'meridian.gold_customer_360', 'daily 05:30', true)
ON CONFLICT (id) DO NOTHING;
