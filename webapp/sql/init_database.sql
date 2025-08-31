-- SiteTracker Database Schema
-- This script creates all the necessary tables for the construction project monitoring application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  general_director_name VARCHAR(255) NOT NULL,
  general_director_email VARCHAR(255) NOT NULL,
  general_director_phone VARCHAR(50) NOT NULL,
  financial_service_name VARCHAR(255) NOT NULL,
  financial_service_email VARCHAR(255) NOT NULL,
  financial_service_phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50) NOT NULL,
  project_director_name VARCHAR(255) NOT NULL,
  project_director_email VARCHAR(255) NOT NULL,
  project_director_phone VARCHAR(50) NOT NULL,
  mission_manager_name VARCHAR(255) NOT NULL,
  mission_manager_email VARCHAR(255) NOT NULL,
  mission_manager_phone VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  global_status VARCHAR(20) DEFAULT 'active' CHECK (global_status IN ('active', 'demobilized')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites table
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies (executing companies) table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for companies and sites
CREATE TABLE IF NOT EXISTS company_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, site_id)
);

-- Monthly tracking table
CREATE TABLE IF NOT EXISTS monthly_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2050),
  total_physical_progress DECIMAL(5,2) CHECK (total_physical_progress >= 0 AND total_physical_progress <= 100),
  monthly_progress DECIMAL(5,2) CHECK (monthly_progress >= 0 AND monthly_progress <= 100),
  normal_monthly_rate DECIMAL(5,2) CHECK (normal_monthly_rate >= 0 AND normal_monthly_rate <= 100),
  target_monthly_rate DECIMAL(5,2) CHECK (target_monthly_rate >= 0 AND target_monthly_rate <= 100),
  delay_monthly_rate DECIMAL(5,2) CHECK (delay_monthly_rate >= 0 AND delay_monthly_rate <= 100),
  observations TEXT,
  status VARCHAR(20) DEFAULT 'good' CHECK (status IN ('good', 'problematic', 'critical')),
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, month, year)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('data_entry_delay', 'problematic', 'critical', 'pre_demobilization', 'demobilization')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  recipients JSONB NOT NULL DEFAULT '[]',
  creation_date TIMESTAMPTZ DEFAULT NOW(),
  sent_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  concerned_month INTEGER CHECK (concerned_month >= 1 AND concerned_month <= 12),
  concerned_year INTEGER CHECK (concerned_year >= 2020 AND concerned_year <= 2050),
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status history table for audit trail
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2050),
  previous_status VARCHAR(20) NOT NULL CHECK (previous_status IN ('good', 'problematic', 'critical')),
  new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('good', 'problematic', 'critical')),
  change_date TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_project_id ON sites(project_id);
CREATE INDEX IF NOT EXISTS idx_company_sites_company_id ON company_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_sites_site_id ON company_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tracking_site_id ON monthly_tracking(site_id);
CREATE INDEX IF NOT EXISTS idx_monthly_tracking_date ON monthly_tracking(year, month);
CREATE INDEX IF NOT EXISTS idx_alerts_project_id ON alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_creation_date ON alerts(creation_date);
CREATE INDEX IF NOT EXISTS idx_status_history_project_id ON status_history(project_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON status_history(year, month);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_tracking_updated_at BEFORE UPDATE ON monthly_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to evaluate tracking status based on business rules
CREATE OR REPLACE FUNCTION evaluate_tracking_status(
  target_rate DECIMAL,
  delay_rate DECIMAL
) RETURNS VARCHAR AS $$
BEGIN
  IF target_rate >= 50 AND delay_rate <= 30 THEN
    RETURN 'good';
  ELSIF target_rate >= 30 AND delay_rate <= 50 THEN
    RETURN 'problematic';
  ELSE
    RETURN 'critical';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set status when monthly tracking is inserted/updated
CREATE OR REPLACE FUNCTION set_tracking_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status = evaluate_tracking_status(
    COALESCE(NEW.target_monthly_rate, 0),
    COALESCE(NEW.delay_monthly_rate, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set status on monthly tracking
CREATE TRIGGER set_monthly_tracking_status 
  BEFORE INSERT OR UPDATE ON monthly_tracking 
  FOR EACH ROW EXECUTE FUNCTION set_tracking_status();

-- Insert sample data for development
INSERT INTO organizations (name, code, general_director_name, general_director_email, general_director_phone, financial_service_name, financial_service_email, financial_service_phone) VALUES
('ATLOGX Construction', 'ATLX-CONST', 'Jean-Pierre Dubois', 'jp.dubois@atlogx.fr', '01 23 45 67 89', 'Marie Financier', 'marie.financier@atlogx.fr', '01 23 45 67 90'),
('ATLOGX Habitat', 'ATLX-HAB', 'Sophie Martin', 's.martin@atlogx.fr', '01 34 56 78 90', 'Pierre Finance', 'pierre.finance@atlogx.fr', '01 34 56 78 91'),
('ATLOGX Infrastructure', 'ATLX-INFRA', 'Michel Bernard', 'm.bernard@atlogx.fr', '01 45 67 89 01', 'Claire Comptable', 'claire.comptable@atlogx.fr', '01 45 67 89 02')
ON CONFLICT (code) DO NOTHING;

-- Insert sample companies
INSERT INTO companies (name, address, email, phone) VALUES
('Entreprise BTP Solutions', '123 Rue de la Construction, 75001 Paris', 'contact@btpsolutions.fr', '01 23 45 67 89'),
('Construction Excellence', '456 Avenue des Bâtisseurs, 69001 Lyon', 'info@construction-excellence.fr', '04 78 90 12 34'),
('Travaux & Co', '789 Boulevard des Travaux, 13001 Marseille', 'contact@travaux-co.fr', '04 91 23 45 67')
ON CONFLICT DO NOTHING;

-- Views for easier data access
CREATE OR REPLACE VIEW project_overview AS
SELECT 
  p.id,
  p.name AS project_name,
  p.code AS project_code,
  o.name AS organization_name,
  p.client_name,
  p.is_active,
  p.global_status,
  COUNT(s.id) AS total_sites,
  COUNT(CASE WHEN p.is_active THEN 1 END) AS active_sites,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN organizations o ON p.organization_id = o.id
LEFT JOIN sites s ON s.project_id = p.id
GROUP BY p.id, o.name;

CREATE OR REPLACE VIEW monthly_tracking_overview AS
SELECT 
  mt.id,
  mt.month,
  mt.year,
  mt.total_physical_progress,
  mt.monthly_progress,
  mt.target_monthly_rate,
  mt.delay_monthly_rate,
  mt.status,
  s.name AS site_name,
  p.name AS project_name,
  o.name AS organization_name,
  mt.entry_date
FROM monthly_tracking mt
JOIN sites s ON mt.site_id = s.id
JOIN projects p ON s.project_id = p.id
JOIN organizations o ON p.organization_id = o.id
ORDER BY mt.year DESC, mt.month DESC, mt.entry_date DESC;

-- RLS (Row Level Security) policies - Enable when authentication is implemented
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE company_sites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE monthly_tracking ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Grant permissions for authenticated users
-- CREATE POLICY "Users can view all data" ON organizations FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "Users can manage organizations" ON organizations FOR ALL USING (auth.role() = 'authenticated');

COMMENT ON TABLE organizations IS 'Organizations with their general directors and financial services';
COMMENT ON TABLE projects IS 'Construction projects with client and project management information';
COMMENT ON TABLE sites IS 'Construction sites associated with projects';
COMMENT ON TABLE companies IS 'Executing companies working on sites';
COMMENT ON TABLE company_sites IS 'Many-to-many relationship between companies and sites';
COMMENT ON TABLE monthly_tracking IS 'Monthly progress tracking data for each site';
COMMENT ON TABLE alerts IS 'Alert notifications for project delays and issues';
COMMENT ON TABLE status_history IS 'Audit trail for status changes';