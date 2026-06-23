-- Raw Material FMS Database Schema
-- Supabase PostgreSQL Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PARTIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. PRODUCTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    available_qty NUMERIC(15, 3) DEFAULT 0.000,
    unit VARCHAR(50) NOT NULL DEFAULT 'MT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. ORDERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    party_id UUID REFERENCES parties(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    qty NUMERIC(15, 3) NOT NULL CHECK (qty > 0),
    rate NUMERIC(15, 2) NOT NULL CHECK (rate >= 0),
    amount NUMERIC(15, 2) GENERATED ALWAYS AS (qty * rate) STORED,
    transport_type VARCHAR(20) NOT NULL CHECK (transport_type IN ('FOR', 'Ex Factory')),
    dispatch_date DATE NOT NULL,
    po_copy_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Logistics' CHECK (status IN ('Pending Logistics', 'Pending Invoice', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. LOGISTICS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS logistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    transporter_name VARCHAR(255) NOT NULL,
    truck_no VARCHAR(50) NOT NULL,
    bilty_no VARCHAR(100) NOT NULL,
    actual_truck_qty NUMERIC(15, 3) NOT NULL CHECK (actual_truck_qty > 0),
    bilty_copy_url TEXT,
    rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('Fixed', 'Per MT')),
    rate_value NUMERIC(15, 2) NOT NULL CHECK (rate_value >= 0),
    freight_amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. INVOICES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    invoice_no VARCHAR(100) NOT NULL UNIQUE,
    invoice_copy_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. INVENTORY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    available_qty NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    sold_qty NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    remaining_qty NUMERIC(15, 3) GENERATED ALWAYS AS (available_qty - sold_qty) STORED,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. ACTIVITY LOGS (AUDIT) TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_role VARCHAR(50) NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 8. USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Sales', 'Logistics', 'Accounts')),
    firm_name VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- COMMON TRIGGERS FOR UPDATED_AT
-- ==========================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parties_modtime BEFORE UPDATE ON parties FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_logistics_modtime BEFORE UPDATE ON logistics FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_invoices_modtime BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_inventory_modtime BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ==========================================
-- STOCK DEDUCTION TRIGGER
-- Deduct available stock when order becomes 'Completed'
-- ==========================================
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    order_qty NUMERIC(15, 3);
    prod_id UUID;
BEGIN
    -- Detect transition to 'Completed'
    IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN
        prod_id := NEW.product_id;
        order_qty := NEW.qty;

        -- Update inventory logs
        UPDATE inventory 
        SET sold_qty = sold_qty + order_qty
        WHERE product_id = prod_id;

        -- Update product available quantity
        UPDATE products
        SET available_qty = available_qty - order_qty
        WHERE id = prod_id;

        -- Create Audit Log
        INSERT INTO activity_logs (user_role, action, details)
        VALUES (
            'System', 
            'Inventory Stock Auto-Deducted', 
            jsonb_build_object(
                'order_no', NEW.order_no, 
                'product_id', prod_id, 
                'deducted_qty', order_qty
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_order_completion
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_status_change();

-- ==========================================
-- AUTOMATIC INVENTORY RECORD CREATION
-- When a new product is added, create its inventory record
-- ==========================================
CREATE OR REPLACE FUNCTION handle_new_product_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (product_id, available_qty, sold_qty)
    VALUES (NEW.id, NEW.available_qty, 0.000)
    ON CONFLICT (product_id) DO UPDATE
    SET available_qty = EXCLUDED.available_qty;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_product_inventory
    AFTER INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_product_inventory();

-- ==========================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Creating general public access policies for client routing
CREATE POLICY "Enable read for all authenticated users" ON parties FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for all authenticated users" ON parties FOR ALL USING (true);

CREATE POLICY "Enable read for all authenticated users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for all authenticated users" ON products FOR ALL USING (true);

CREATE POLICY "Enable read for all authenticated users" ON orders FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for all authenticated users" ON orders FOR ALL USING (true);

CREATE POLICY "Enable read for all authenticated users" ON logistics FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for all authenticated users" ON logistics FOR ALL USING (true);

CREATE POLICY "Enable read for all authenticated users" ON invoices FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for all authenticated users" ON invoices FOR ALL USING (true);

CREATE POLICY "Enable read for all authenticated users" ON inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for all authenticated users" ON inventory FOR ALL USING (true);

CREATE POLICY "Enable read for all authenticated users" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON activity_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all authenticated users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert/update/delete for all authenticated users" ON users FOR ALL USING (true);

-- ==========================================
-- INITIAL DATA SEEDING SQL
-- ==========================================
-- Seed Products
INSERT INTO products (name, available_qty, unit) VALUES
('Steam Coal (Grade A)', 5000.000, 'MT'),
('Hot Rolled Steel Plates', 2500.000, 'MT'),
('Iron Ore Fine (62% Fe)', 8000.000, 'MT'),
('Crushed Limestone', 12000.000, 'MT'),
('Silica Sand', 4500.000, 'MT')
ON CONFLICT (name) DO NOTHING;

-- Seed Parties
INSERT INTO parties (name) VALUES
('Apex Steel Industries Ltd.'),
('Global Cement Corporation'),
('Deccan Thermal Power Station'),
('Zenith Metal Works Corp.'),
('Pioneer Engineering Foundry')
ON CONFLICT (name) DO NOTHING;

-- Seed Users
INSERT INTO users (user_name, password, role, firm_name) VALUES
('admin', '123', 'Admin', 'Pmmpl'),
('sales', '123', 'Sales', 'RKL'),
('logistics', '123', 'Logistics', ''),
('accounts', '123', 'Accounts', '')
ON CONFLICT (user_name) DO NOTHING;
