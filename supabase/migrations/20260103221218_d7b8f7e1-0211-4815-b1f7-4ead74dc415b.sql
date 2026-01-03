-- Index pour filtrer rapidement les pending
CREATE INDEX IF NOT EXISTS idx_keyword_aliases_status ON keyword_aliases(status);

-- Index pour recherche phonétique
CREATE INDEX IF NOT EXISTS idx_keyword_aliases_phonetic ON keyword_aliases(phonetic_key);

-- Contrainte pour valider les statuts
ALTER TABLE keyword_aliases DROP CONSTRAINT IF EXISTS keyword_aliases_status_check;
ALTER TABLE keyword_aliases ADD CONSTRAINT keyword_aliases_status_check 
  CHECK (status IN ('pending', 'validated', 'rejected'));