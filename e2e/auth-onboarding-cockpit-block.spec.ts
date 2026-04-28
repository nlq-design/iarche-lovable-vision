import { test, expect } from "../playwright-fixture";

/**
 * E2E — M4 Auth flow
 * Vérifie qu'un nouveau compte créé via invite-code (sans cockpit_user/cockpit_admin) :
 *  1. Est redirigé vers /onboarding après signup (si session immédiate)
 *  2. Peut finaliser l'onboarding et arrive sur /cockpit
 *  3. Se voit refuser l'accès par ProtectedCockpitRoute (motif NO_ROLE)
 *
 * Pré-requis BDD : invite_code 'E2E-NONADMIN-TEST' présent
 * (cf. migration 20260428201035_e2e_test_invite_code.sql)
 *
 * Note : pollution auth.users assumée. Comptes préfixés `e2e-*@iarche-test.local`,
 * cleanup manuel hors scope du test.
 */

const INVITE_CODE = "E2E-NONADMIN-TEST";
const PASSWORD = "E2eTest!2026Secure"; // 12+ chars, maj, chiffre, spécial

test.describe("M4 Auth — Non-admin onboarding & /cockpit blocking", () => {
  test("non-admin signup → onboarding → /cockpit blocked with NO_ROLE", async ({ page }) => {
    const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@iarche-test.local`;

    // 1. Signup
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /Créer un compte/i })).toBeVisible();

    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirmer le mot de passe").fill(PASSWORD);
    await page.getByLabel("Code d'invitation").fill(INVITE_CODE);

    await page.getByRole("button", { name: /Créer mon compte/i }).click();

    // 2. Wait for post-signup navigation
    // Two possible paths depending on Supabase email-confirm setting:
    //  - session immediate → /onboarding
    //  - email confirm required → /login (we skip the rest with explicit message)
    await page.waitForURL(/\/(onboarding|login)/, { timeout: 15000 });

    if (page.url().includes("/login")) {
      test.skip(
        true,
        "Email confirmation is enabled — signup did not return a session. Disable confirm-email or pre-confirm via service role to run the full flow."
      );
      return;
    }

    // 3. Onboarding step
    await expect(page.getByText(/Bienvenue chez IArche/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /accéder à mon espace/i }).click();

    // 4. Lands on /cockpit but ProtectedCockpitRoute blocks (NO_ROLE)
    await page.waitForURL(/\/cockpit/, { timeout: 10000 });

    // The denied card shows "Accès non autorisé" + cockpit-specific copy
    await expect(page.getByText(/Accès non autorisé/i)).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/permissions nécessaires pour accéder au Cockpit/i)
    ).toBeVisible();

    // 5. Confirm we did NOT silently get redirected away from /cockpit
    expect(page.url()).toMatch(/\/cockpit/);

    // 6. Direct re-navigation to /cockpit should produce the same block
    await page.goto("/cockpit");
    await expect(page.getByText(/Accès non autorisé/i)).toBeVisible({ timeout: 10000 });
  });
});
