-- Financial Portal - Initial Database Schema
-- Companies, Users, Documents, Transactions, Audit Log

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANIES
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  short_code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO companies (name, short_code) VALUES
  ('Sian Soon Enterprise Company', 'SSE'),
  ('Sian Soon Manufacturing Sdn Bhd', 'SSM');

-- ============================================
-- CURRENCY ACCOUNTS
-- ============================================
CREATE TABLE currency_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  currency VARCHAR(3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, currency)
);

-- Insert currency accounts for both companies
INSERT INTO currency_accounts (company_id, currency)
SELECT c.id, curr.code
FROM companies c
CROSS JOIN (VALUES ('RM'), ('CAD'), ('USD'), ('AUD'), ('EUR')) AS curr(code);

-- ============================================
-- USERS
-- ============================================
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'accountant');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TYPE document_type AS ENUM (
  'purchase_order', 'delivery_order', 'invoice',
  'bank_statement', 'settlement_statement', 'exchange_receipt'
);

CREATE TYPE document_status AS ENUM ('pending', 'processed', 'matched', 'flagged', 'error');

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  currency_account_id UUID REFERENCES currency_accounts(id),
  document_type document_type NOT NULL,
  status document_status DEFAULT 'pending',

  -- File info
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Extracted data (populated by AI)
  extracted_data JSONB DEFAULT '{}',
  ai_detected_company VARCHAR(255),
  company_mismatch BOOLEAN DEFAULT false,
  mismatch_resolved BOOLEAN DEFAULT false,
  mismatch_resolved_by UUID REFERENCES users(id),

  -- Document-specific fields
  document_number VARCHAR(100),
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name VARCHAR(255),
  amount DECIMAL(15,2),
  currency VARCHAR(3),
  document_date DATE,

  -- Payment terms (for invoices)
  payment_terms VARCHAR(100),
  due_date DATE,

  -- Metadata
  uploaded_by UUID NOT NULL REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_supplier ON documents(supplier_id);
CREATE INDEX idx_documents_date ON documents(document_date);

-- ============================================
-- BANK STATEMENT ENTRIES
-- ============================================
CREATE TYPE bank_entry_type AS ENUM ('debit', 'credit');

CREATE TABLE bank_statement_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  currency_account_id UUID NOT NULL REFERENCES currency_accounts(id),

  entry_date DATE NOT NULL,
  description TEXT,
  entry_type bank_entry_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  balance DECIMAL(15,2),
  currency VARCHAR(3) NOT NULL,

  -- Matching
  matched BOOLEAN DEFAULT false,
  matched_document_id UUID REFERENCES documents(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_entries_company ON bank_statement_entries(company_id);
CREATE INDEX idx_bank_entries_date ON bank_statement_entries(entry_date);

-- ============================================
-- DOCUMENT MATCHES (PO + DO + Invoice linking)
-- ============================================
CREATE TYPE match_status AS ENUM ('auto_matched', 'ai_suggested', 'manual', 'needs_review', 'resolved', 'rejected');

CREATE TABLE document_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),

  purchase_order_id UUID REFERENCES documents(id),
  delivery_order_id UUID REFERENCES documents(id),
  invoice_id UUID REFERENCES documents(id),
  bank_entry_id UUID REFERENCES bank_statement_entries(id),

  status match_status NOT NULL DEFAULT 'needs_review',
  confidence DECIMAL(5,2),
  ai_reasoning TEXT,
  ai_model VARCHAR(50),

  -- Mismatch details
  has_mismatch BOOLEAN DEFAULT false,
  mismatch_type VARCHAR(100),
  mismatch_details JSONB DEFAULT '{}',

  -- Resolution
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_company ON document_matches(company_id);
CREATE INDEX idx_matches_status ON document_matches(status);

-- ============================================
-- SETTLEMENT STATEMENTS (Auction House)
-- ============================================
CREATE TABLE settlement_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  currency_account_id UUID NOT NULL REFERENCES currency_accounts(id),

  auction_house_name VARCHAR(255),
  settlement_date DATE,
  currency VARCHAR(3) NOT NULL,
  total_amount DECIMAL(15,2),
  items_sold JSONB DEFAULT '[]',

  -- Link to bank credit
  matched_bank_entry_id UUID REFERENCES bank_statement_entries(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXCHANGE RECEIPTS
-- ============================================
CREATE TABLE exchange_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  original_currency VARCHAR(3) NOT NULL,
  original_amount DECIMAL(15,2) NOT NULL,
  converted_currency VARCHAR(3) DEFAULT 'RM',
  converted_amount DECIMAL(15,2) NOT NULL,
  exchange_rate DECIMAL(10,6) NOT NULL,
  exchange_date DATE NOT NULL,

  -- Link to original foreign currency transaction
  linked_settlement_id UUID REFERENCES settlement_statements(id),
  linked_bank_entry_id UUID REFERENCES bank_statement_entries(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERTS / NOTIFICATIONS
-- ============================================
CREATE TYPE alert_type AS ENUM ('mismatch', 'payment_due', 'overdue', 'company_mismatch', 'unresolved');

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  alert_type alert_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_read ON alerts(is_read);

-- ============================================
-- AUDIT LOG (APPEND-ONLY)
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  record_type VARCHAR(50) NOT NULL,
  record_id UUID,
  record_description TEXT,
  before_value JSONB,
  after_value JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: Remove UPDATE and DELETE permissions on audit_log
-- This is enforced at the application level and can also be enforced via DB roles
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_date ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action_type);
