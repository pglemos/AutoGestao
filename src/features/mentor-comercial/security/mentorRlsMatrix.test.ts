import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import {
  CATALOG_TABLES,
  hasRlsPermission,
  isCatalogTable,
  MENTOR_RLS_MATRIX,
  MENTOR_TABLES,
  MENTOR_USER_PROFILES,
  MentorTable,
  MentorUserProfile,
  RLS_OPERATIONS,
  RlsOperation,
} from './mentorRlsMatrix';

describe('MentorRlsMatrix - Validação de Integridade da Matriz em Memória', () => {
  test('deve conter exatamente 8 tabelas de domínio do Mentor Comercial', () => {
    expect(MENTOR_TABLES.length).toBe(8);
    expect(Object.keys(MENTOR_RLS_MATRIX).sort()).toEqual([...MENTOR_TABLES].sort());
  });

  test('deve conter 5 tabelas no grupo de catálogos mestre', () => {
    expect(CATALOG_TABLES.length).toBe(5);
    for (const table of CATALOG_TABLES) {
      expect(isCatalogTable(table)).toBe(true);
    }
    expect(isCatalogTable('mentor_pending_flags')).toBe(false);
    expect(isCatalogTable('mentor_score_snapshots')).toBe(false);
    expect(isCatalogTable('store_commercial_settings')).toBe(false);
  });

  test('deve ter definições completas para todas as combinações de tabela, perfil e operação', () => {
    for (const table of MENTOR_TABLES) {
      for (const profile of MENTOR_USER_PROFILES) {
        for (const operation of RLS_OPERATIONS) {
          const allowed = hasRlsPermission(table, profile, operation);
          expect(typeof allowed).toBe('boolean');
        }
      }
    }
  });

  test('regra: usuário anônimo (anon) NUNCA possui permissão em nenhuma tabela ou operação', () => {
    for (const table of MENTOR_TABLES) {
      for (const operation of RLS_OPERATIONS) {
        expect(hasRlsPermission(table, 'anon', operation)).toBe(false);
      }
    }
  });

  test('regra: vendedor NÃO pode alterar catálogos (status, cadências, passos, scripts, transições)', () => {
    for (const table of CATALOG_TABLES) {
      expect(hasRlsPermission(table, 'vendedor_dono', 'insert')).toBe(false);
      expect(hasRlsPermission(table, 'vendedor_dono', 'update')).toBe(false);
      expect(hasRlsPermission(table, 'vendedor_dono', 'delete')).toBe(false);

      expect(hasRlsPermission(table, 'vendedor_outro', 'insert')).toBe(false);
      expect(hasRlsPermission(table, 'vendedor_outro', 'update')).toBe(false);
      expect(hasRlsPermission(table, 'vendedor_outro', 'delete')).toBe(false);
    }
  });

  test('regra: catálogos só podem ser alterados por admin e área interna MX', () => {
    const writeOperations: RlsOperation[] = ['insert', 'update', 'delete'];
    const nonAdminProfiles: MentorUserProfile[] = [
      'vendedor_dono',
      'vendedor_outro',
      'gerente',
      'dono',
      'anon',
    ];

    for (const table of CATALOG_TABLES) {
      // Admin e Área Interna possuem acesso de escrita
      for (const op of writeOperations) {
        expect(hasRlsPermission(table, 'admin', op)).toBe(true);
        expect(hasRlsPermission(table, 'area_interna_mx', op)).toBe(true);
      }

      // Demais perfis não possuem acesso de escrita
      for (const profile of nonAdminProfiles) {
        for (const op of writeOperations) {
          expect(hasRlsPermission(table, profile, op)).toBe(false);
        }
      }
    }
  });

  test('regra: vendedor lê e atualiza SÓ as suas pendências (mentor_pending_flags)', () => {
    const table: MentorTable = 'mentor_pending_flags';

    // Vendedor dono da pendência
    expect(hasRlsPermission(table, 'vendedor_dono', 'select')).toBe(true);
    expect(hasRlsPermission(table, 'vendedor_dono', 'insert')).toBe(true);
    expect(hasRlsPermission(table, 'vendedor_dono', 'update')).toBe(true);
    expect(hasRlsPermission(table, 'vendedor_dono', 'delete')).toBe(false);

    // Vendedor de outra loja/propriedade
    expect(hasRlsPermission(table, 'vendedor_outro', 'select')).toBe(false);
    expect(hasRlsPermission(table, 'vendedor_outro', 'insert')).toBe(false);
    expect(hasRlsPermission(table, 'vendedor_outro', 'update')).toBe(false);
    expect(hasRlsPermission(table, 'vendedor_outro', 'delete')).toBe(false);
  });

  test('regra: mentor_score_snapshots é auditoria - sem update nem delete para NENHUM perfil', () => {
    const table: MentorTable = 'mentor_score_snapshots';

    for (const profile of MENTOR_USER_PROFILES) {
      expect(hasRlsPermission(table, profile, 'update')).toBe(false);
      expect(hasRlsPermission(table, profile, 'delete')).toBe(false);
    }

    // Leitura e inserção autorizadas para perfis internos
    expect(hasRlsPermission(table, 'vendedor_dono', 'select')).toBe(true);
    expect(hasRlsPermission(table, 'vendedor_dono', 'insert')).toBe(true);
    expect(hasRlsPermission(table, 'gerente', 'select')).toBe(true);
    expect(hasRlsPermission(table, 'gerente', 'insert')).toBe(true);
    expect(hasRlsPermission(table, 'dono', 'select')).toBe(true);
    expect(hasRlsPermission(table, 'dono', 'insert')).toBe(true);
  });

  test('regra: store_commercial_settings - vendedor lê (da sua loja), mas NÃO escreve; gestor e dono escrevem', () => {
    const table: MentorTable = 'store_commercial_settings';

    // Vendedor dono lê mas não escreve
    expect(hasRlsPermission(table, 'vendedor_dono', 'select')).toBe(true);
    expect(hasRlsPermission(table, 'vendedor_dono', 'insert')).toBe(false);
    expect(hasRlsPermission(table, 'vendedor_dono', 'update')).toBe(false);
    expect(hasRlsPermission(table, 'vendedor_dono', 'delete')).toBe(false);

    // Vendedor de outra loja nem lê
    expect(hasRlsPermission(table, 'vendedor_outro', 'select')).toBe(false);

    // Gestor e Dono têm acesso completo de escrita e leitura
    expect(hasRlsPermission(table, 'gerente', 'select')).toBe(true);
    expect(hasRlsPermission(table, 'gerente', 'update')).toBe(true);

    expect(hasRlsPermission(table, 'dono', 'select')).toBe(true);
    expect(hasRlsPermission(table, 'dono', 'update')).toBe(true);
  });
});

describe('MentorRlsMatrix - Validação contra SQL da Migration Real', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql'
  );

  let migrationSql: string;

  test('arquivo de migration deve existir no projeto', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    expect(migrationSql.length).toBeGreaterThan(1000);
  });

  test('todas as 8 tabelas devem ter ENABLE ROW LEVEL SECURITY na migration', () => {
    for (const table of MENTOR_TABLES) {
      const regex = new RegExp(
        `ALTER\\s+TABLE\\s+(?:public\\.)?${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i'
      );
      expect(regex.test(migrationSql)).toBe(true);
    }
  });

  test('todas as 8 tabelas devem ter REVOKE ALL FROM PUBLIC e GRANT SELECT na migration via loop ou instrução direta', () => {
    expect(migrationSql.includes("REVOKE ALL ON public.%I FROM PUBLIC")).toBe(true);
    expect(migrationSql.includes("GRANT SELECT ON public.%I TO authenticated")).toBe(true);

    // Confirma que todas as 8 tabelas estão incluídas no array de concessão de grants
    for (const table of MENTOR_TABLES) {
      expect(migrationSql.includes(`'${table}'`)).toBe(true);
    }
  });

  test('catálogos mestre devem ter política de escrita restrita a admin / área interna MX', () => {
    expect(migrationSql.includes('%1$s_write_admin')).toBe(true);
    expect(migrationSql.includes('public.is_admin() OR public.eh_area_interna_mx(auth.uid())')).toBe(true);
  });

  test('mentor_pending_flags deve conter política operacional com checagem de seller_user_id e roles', () => {
    expect(migrationSql.includes('CREATE POLICY mentor_pending_flags_operacional')).toBe(true);
    expect(migrationSql.includes('seller_user_id = auth.uid()')).toBe(true);
    expect(migrationSql.includes('public.is_manager_of(loja_id)')).toBe(true);
    expect(migrationSql.includes('public.is_owner_of(loja_id)')).toBe(true);
  });

  test('mentor_score_snapshots deve possuir políticas SELECT e INSERT, mas NUNCA UPDATE ou DELETE', () => {
    expect(migrationSql.includes('CREATE POLICY mentor_score_snapshots_select')).toBe(true);
    expect(migrationSql.includes('CREATE POLICY mentor_score_snapshots_insert')).toBe(true);

    // Garante que não existem políticas de UPDATE nem DELETE para mentor_score_snapshots
    expect(/CREATE POLICY mentor_score_snapshots_update/i.test(migrationSql)).toBe(false);
    expect(/CREATE POLICY mentor_score_snapshots_delete/i.test(migrationSql)).toBe(false);
    expect(/CREATE POLICY mentor_score_snapshots_all/i.test(migrationSql)).toBe(false);
  });

  test('store_commercial_settings deve separar políticas SELECT e WRITE', () => {
    expect(migrationSql.includes('CREATE POLICY store_commercial_settings_select')).toBe(true);
    expect(migrationSql.includes('CREATE POLICY store_commercial_settings_write')).toBe(true);
    expect(migrationSql.includes('o.seller_user_id = auth.uid()')).toBe(true);
  });
});
