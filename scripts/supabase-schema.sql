-- ──────────────────────────────────────────────
-- SAFP DATABASE SCHEMA
-- Supabase PostgreSQL
-- ──────────────────────────────────────────────

-- 1. TABLA: profiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL,
    family_id UUID REFERENCES families(id),
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: families
CREATE TABLE IF NOT EXISTS families (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. TABLA: family_members
CREATE TABLE IF NOT EXISTS family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('hombre', 'mujer', 'niña', 'niño')),
    age INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    objective TEXT CHECK (objective IN ('bajar_grasa', 'ganar_musculo', 'mantener', 'crecimiento')),
    health_conditions TEXT[],
    vegan_days INTEGER[],
    protein_vegetal TEXT DEFAULT 'carve',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: system_config
CREATE TABLE IF NOT EXISTS system_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE UNIQUE,
    fasting_enabled BOOLEAN DEFAULT TRUE,
    fasting_days INTEGER[] DEFAULT '{1,4,7}',
    meals_per_day_adults INTEGER DEFAULT 2,
    meals_per_day_children INTEGER DEFAULT 3,
    protein_rotation TEXT[] DEFAULT '{"pollo","res","cerdo","atun","huevos","carve"}',
    budget_monthly DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: weekly_menus
CREATE TABLE IF NOT EXISTS weekly_menus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    week_number INTEGER,
    month INTEGER,
    year INTEGER,
    menu_data JSONB,
    shopping_list JSONB,
    status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador', 'aprobado', 'archivado')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 6. TABLA: menu_history
CREATE TABLE IF NOT EXISTS menu_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES weekly_menus(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    pdf_url TEXT
);

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_history ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: profiles
CREATE POLICY "Usuarios ven su propio perfil"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Usuarios actualizan su propio perfil"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- POLÍTICAS: families
CREATE POLICY "Usuarios ven su familia"
ON families FOR SELECT
USING (
    id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
);

-- POLÍTICAS: family_members
CREATE POLICY "Usuarios ven miembros de su familia"
ON family_members FOR SELECT
USING (
    family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Admin gestiona miembros"
ON family_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND family_id = family_members.family_id
        AND role = 'admin'
    )
);

-- POLÍTICAS: system_config
CREATE POLICY "Admin ve y edita configuración"
ON system_config FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND family_id = system_config.family_id
        AND role = 'admin'
    )
);

-- POLÍTICAS: weekly_menus
CREATE POLICY "Admin gestiona menús"
ON weekly_menus FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND family_id = weekly_menus.family_id
        AND role = 'admin'
    )
);

CREATE POLICY "Miembros ven menús aprobados"
ON weekly_menus FOR SELECT
USING (
    status = 'aprobado'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND family_id = weekly_menus.family_id
    )
);

-- ──────────────────────────────────────────────
-- TRIGGERS Y FUNCIONES
-- ──────────────────────────────────────────────

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_family_members_updated_at
BEFORE UPDATE ON family_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_system_config_updated_at
BEFORE UPDATE ON system_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
