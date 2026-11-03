/*
  Vérifications de l'interface, dans un vrai navigateur.

  On clique comme le ferait un humain : ouvrir un écran, remplir une fenêtre,
  enregistrer, et vérifier ce que la page affiche ensuite. Ça attrape ce que les
  tests d'API ne voient pas : un bouton qui n'écoute rien, une fenêtre qui ne se
  ferme pas, un tableau qui ne se rafraîchit pas.

  Usage : node ui-tests.js [adresse-du-site] [adresse-de-l-api]
  La base visée par l'API est modifiée : ne jamais pointer la production.
*/
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://127.0.0.1:8090';
const API = process.argv[3] || 'http://127.0.0.1:3100';
const ADMIN = { email: 'admin@myhoop.ca', password: 'AdminTest123!' };

let pass = 0;
let fail = 0;
const ok = (m) => { pass++; console.log(`ok   - ${m}`); };
const bad = (m, d) => { fail++; console.log(`ECHEC - ${m} (${d})`); };
const check = (m, got, want) => (String(got) === String(want) ? ok(m) : bad(m, `attendu ${want}, obtenu ${got}`));
const has = (m, text, needle) => (String(text).includes(needle) ? ok(m) : bad(m, `« ${needle} » absent`));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  // Les appels vers l'API de production sont bloqués : en test, les modules
  // visent l'API locale (voir API_BASE), et ce qui pointerait encore vers
  // api.myhoop.ca ne doit surtout pas partir.
  await page.route('**://api.myhoop.ca/**', (route) => route.abort());

  console.log('── Pages publiques de la ligue ──────────────────────────────');

  await page.goto(`${SITE}/league.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lg-standings', { timeout: 10000 });
  const rows = await page.locator('.lg-standings tbody tr').count();
  check('le classement affiche les 16 équipes', rows, 16);

  const first = await page.locator('.lg-standings tbody tr').first().innerText();
  has('la première ligne montre un bilan', first, '5');

  await page.click('.lg-tab:has-text("Schedule")');
  await page.waitForSelector('.lg-match', { timeout: 10000 });
  ok('l’onglet calendrier affiche des matchs');

  const more = page.locator('.lg-more');
  if (await more.count()) {
    const before = await page.locator('.lg-day').count();
    await more.click();
    await page.waitForTimeout(300);
    const after = await page.locator('.lg-day').count();
    check('« voir plus » révèle d’autres journées', after > before, 'true');
  }

  await page.click('.lg-subtab:has-text("Results")');
  await page.waitForSelector('.lg-match.is-done', { timeout: 10000 });
  ok('l’onglet résultats affiche des scores');

  await page.goto(`${SITE}/league.html?tab=teams`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.lg-team-card');
  await page.locator('.lg-team-card').first().click();
  await page.waitForSelector('.lg-team-head-name', { timeout: 10000 });
  ok('cliquer une équipe ouvre sa fiche');

  const teamPage = await page.locator('#league-page').innerText();
  has('la fiche montre la composition', teamPage, 'Roster');

  // Rien de personnel ne doit sortir sur les pages publiques.
  const leak = /@[a-z0-9.-]+\.[a-z]{2,}|emergency|medical/i.test(teamPage);
  check('aucune donnée personnelle sur la fiche d’équipe', leak, 'false');

  console.log('');
  console.log('── Admin ────────────────────────────────────────────────────');

  await page.goto(`${SITE}/admin.html`, { waitUntil: 'networkidle' });
  has('sans connexion, la page est fermée', await page.textContent('#admin-wrapper'), 'admins only');

  await page.evaluate(async ({ api, creds }) => {
    await fetch(`${api}/api/auth/login`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
  }, { api: API, creds: ADMIN });

  await page.goto('about:blank');
  await page.goto(`${SITE}/admin.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.adm-cards', { timeout: 10000 });
  ok('connecté, le tableau de bord s’affiche');

  // ── Saisie d'un résultat ───────────────────────────────────
  await page.click('.adm-tab:has-text("Schedule")');
  await page.waitForSelector('#adm-sch-body tr[data-match]', { timeout: 10000 });

  const compName = await page.locator('#adm-sch-comp option:checked').innerText();
  has('la saison en cours est présélectionnée', compName, 'Union League');

  const scoreBtn = page.locator('#adm-sch-body [data-result]').first();
  await scoreBtn.click();
  await page.waitForSelector('.adm-modal.is-open', { timeout: 5000 });
  ok('la fenêtre de saisie du score s’ouvre');

  await page.fill('#f-score_a', '77');
  await page.fill('#f-score_b', '77');
  await page.click('.adm-modal .adm-btn-primary');
  await page.waitForTimeout(900);
  has('une égalité est refusée avec un message clair',
      await page.textContent('#adm-modal-toast'), 'tie');

  await page.fill('#f-score_b', '70');
  await page.click('.adm-modal .adm-btn-primary');
  await page.waitForSelector('.adm-modal.is-open', { state: 'detached', timeout: 8000 });
  ok('un score valide est enregistré et la fenêtre se ferme');

  await page.waitForTimeout(600);
  has('l’écran du dessous confirme l’enregistrement',
      await page.textContent('#adm-sch-toast'), 'Result saved');

  // ── Feuille de pointage ────────────────────────────────────
  // On vise un match d'une équipe dont l'effectif a des joueurs avec profil :
  // une équipe sans profils n'a rien à remplir, et c'est normal.
  await page.selectOption('#adm-sch-status', 'completed');
  await page.waitForTimeout(1200);
  const boxBtn = page.locator('#adm-sch-body tr', { hasText: 'Not Like Us' })
                     .locator('[data-box]').first();
  await boxBtn.click();
  await page.waitForSelector('.adm-modal.is-open', { timeout: 5000 });

  const boxRows = await page.locator('#adm-bs-body tr').count();
  check('la feuille de pointage liste déjà les joueurs des deux effectifs', boxRows > 0, 'true');

  const wl = await page.locator('#adm-bs-body tr .adm-bs-result').first().innerText();
  check('la colonne victoire/défaite est déjà remplie par la base', ['W', 'L'].includes(wl.trim()), 'true');

  await page.locator('#adm-bs-body tr').first().locator('[data-k="points"]').fill('31');
  await page.click('.adm-modal .adm-btn-primary');
  await page.waitForSelector('.adm-modal.is-open', { state: 'detached', timeout: 8000 });
  ok('la feuille de pointage est enregistrée (pas d’erreur de doublon)');

  await boxBtn.click();
  await page.waitForSelector('#adm-bs-body tr', { timeout: 5000 });
  const saved = await page.locator('#adm-bs-body tr').first().locator('[data-k="points"]').inputValue();
  check('les points sont bien relus', saved, '31');
  await page.click('.adm-modal-close');

  // ── Inscriptions et formulaire ─────────────────────────────
  await page.click('.adm-tab:has-text("Registrations")');
  await page.waitForSelector('#adm-reg-body tr[data-reg]', { timeout: 10000 });
  const regText = await page.textContent('#adm-reg-body');
  has('la liste montre les inscrits', regText, 'Joachim');

  await page.locator('#adm-reg-body [data-open]').first().click();
  await page.waitForSelector('.adm-modal.is-open', { timeout: 5000 });
  const detail = await page.textContent('.adm-modal-body');
  has('le détail affiche les réponses au formulaire', detail, 'Form answers');
  // Le libellé vient du formulaire, pas la clé technique (emergency_contact_name).
  const technicalKey = /emergency_contact_name|waiver_signed|shirt_size/.test(detail);
  check('les réponses portent leur libellé, pas la clé technique', technicalKey, 'false');
  has('une réponse sensible est signalée', detail, 'private');
  await page.click('.adm-modal-close');

  // ── Paiements ──────────────────────────────────────────────
  await page.click('.adm-tab:has-text("Payments")');
  await page.waitForSelector('#adm-pay-body', { timeout: 10000 });
  ok('l’écran des paiements s’ouvre');

  // ── Équipes et effectifs ───────────────────────────────────
  await page.click('.adm-tab:has-text("Teams")');
  await page.waitForSelector('#adm-team-body tr[data-team]', { timeout: 10000 });
  await page.locator('#adm-team-body [data-roster]').first().click();
  await page.waitForSelector('.adm-modal.is-open', { timeout: 5000 });
  has('la fenêtre d’effectif propose les deux façons d’ajouter quelqu’un',
      await page.textContent('.adm-modal-body'), 'without an account');
  await page.click('.adm-modal-close');

  // ── Saisons ────────────────────────────────────────────────
  await page.click('.adm-tab:has-text("Seasons")');
  // On attend une vraie ligne : la première est « Loading… » pendant la requête.
  await page.waitForSelector('#adm-comp-body tr[data-comp]', { timeout: 10000 });
  has('les saisons indiquent si elles sont publiées',
      await page.textContent('#adm-comp-body'), 'Published');


  console.log('');
  console.log('── Le joueur publie son profil ──────────────────────────────');

  // Un compte neuf, créé par l'API comme le ferait la page d'inscription.
  const who = { first_name: 'Nina', last_name: 'Parent', email: `nina${Date.now()}@example.com`,
                password: 'MotDePasse123!' };

  // Onglet séparé : sans ça, se connecter en joueuse remplacerait la session
  // admin de l'onglet précédent, et la suite des tests échouerait.
  const ctxPlayer = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  const player = await ctxPlayer.newPage();
  player.on('pageerror', (e) => pageErrors.push('joueuse: ' + e.message));

  await player.goto(`${SITE}/players.html`);
  const signup = await player.evaluate(async ({ api, who }) => {
    const r = await fetch(`${api}/api/auth/signup`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(who) });
    const b = await r.json();
    return { status: r.status, slug: b?.data?.user?.slug };
  }, { api: API, who });
  check('création d’un compte joueur', signup.status, 201);

  await player.goto('about:blank');
  await player.goto(`${SITE}/players.html?slug=${signup.slug}`, { waitUntil: 'networkidle' });
  await player.waitForTimeout(1500);

  // Sans ce rattrapage, un joueur non publié verrait « introuvable » sur sa
  // propre page, et n'atteindrait jamais le bouton qui la rend publique.
  const own = await player.textContent('#profile-wrapper');
  has('un joueur non publié voit quand même sa propre page', own, 'Nina');
  has('un bandeau lui dit que son profil est privé', own, 'profile is private');

  await player.click('#profile-go-public');
  await player.waitForSelector('#visibility-form', { timeout: 5000 });
  ok('le bandeau ouvre la fenêtre de visibilité');

  await player.check('#visibility-form input[name="is_public"]');
  await player.check('#visibility-form input[name="show_contact"]');
  await player.fill('#vis-instagram', '@nina');
  await player.click('#visibility-form .reg-submit');
  await player.waitForTimeout(2000);

  // Vérification côté serveur : la fiche doit maintenant sortir sur la route
  // publique, celle que lisent le Hub et les pages de la ligue.
  const pub = await player.evaluate(async ({ api, slug }) => {
    const r = await fetch(`${api}/api/players/slug/${slug}`);
    return { status: r.status, body: r.ok ? await r.json() : null };
  }, { api: API, slug: signup.slug });
  check('la fiche est maintenant publique', pub.status, 200);
  check('son Instagram sort parce qu’elle l’a choisi',
        pub.body?.data?.player?.instagram_handle, '@nina');
  const leaked = JSON.stringify(pub.body || {}).includes(who.email);
  check('son courriel de compte ne sort pas pour autant', leaked, 'false');

  // Et on repasse en privé : la fiche doit disparaître des pages publiques.
  await player.goto('about:blank');
  await player.goto(`${SITE}/players.html?slug=${signup.slug}`, { waitUntil: 'networkidle' });
  await player.waitForTimeout(1200);
  await player.click('#profile-visibility-btn');
  await player.waitForSelector('#visibility-form', { timeout: 5000 });
  await player.uncheck('#visibility-form input[name="is_public"]');
  await player.click('#visibility-form .reg-submit');
  await player.waitForTimeout(2000);

  const gone = await player.evaluate(async ({ api, slug }) => {
    const r = await fetch(`${api}/api/players/slug/${slug}`);
    return r.status;
  }, { api: API, slug: signup.slug });
  check('repassée en privé, elle disparaît des pages publiques', gone, 404);
  await ctxPlayer.close();

  console.log('');
  console.log('── Inscription sans compte, pilotée par le formulaire ───────');

  // Un tournoi ouvert avec un formulaire : celui que les tests d'API ont monté.
  const trn = await page.evaluate(async ({ api }) => {
    const r = await fetch(`${api}/api/tournaments`);
    const b = await r.json();
    const t = b.data.tournaments.find((x) => x.status === 'open');
    return t ? { tournament_id: t.tournament_id, name: t.name, entry_fee: t.entry_fee,
                 location: t.location, starts_at: t.starts_at, status: t.status } : null;
  }, { api: API });
  check('un tournoi ouvert existe pour le test', Boolean(trn), 'true');

  // On ouvre la fenêtre en visiteur, sans compte.
  const ctx2 = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  const guest = await ctx2.newPage();
  guest.on('pageerror', (e) => pageErrors.push('invité: ' + e.message));
  await guest.goto(`${SITE}/entertainment.html`, { waitUntil: 'networkidle' });
  await guest.evaluate((t) => window.openRegistration(t), trn);
  await guest.waitForSelector('#reg-form', { timeout: 10000 });

  const formText = await guest.textContent('#reg-form');
  has('la fenêtre s’ouvre sans compte', formText, 'No account needed');
  has('elle affiche une question venue de la base', formText, 'urgence');
  has('une question sensible est signalée', formText, 'only the organizer sees this');

  const mail = `joueur${Date.now()}@example.com`;
  await guest.fill('#reg-first', 'Sans');
  await guest.fill('#reg-last', 'Compte');
  await guest.fill('#reg-email', mail);
  await guest.fill('#q-emergency_contact_name', 'Marie Compte');
  await guest.fill('#q-emergency_contact_phone', '780-555-0144');
  await guest.selectOption('#q-shirt_size', 'L');

  // On envoie SANS cocher la décharge. Le navigateur bloque avant même
  // l'envoi, grâce au « required » posé d'après le formulaire de la base.
  await guest.click('#reg-form .reg-submit');
  await guest.waitForTimeout(1000);
  check('une question obligatoire non remplie bloque l’envoi',
        await guest.locator('#reg-payment-sent').count(), 0);

  await guest.check('#q-waiver_signed');
  await guest.click('#reg-form .reg-submit');
  await guest.waitForSelector('#reg-payment-sent', { timeout: 10000 });
  ok('l’inscription passe et l’étape de paiement s’affiche');

  has('le montant affiché vient du tournoi',
      await guest.textContent('.reg-payment'), '$40');

  await guest.click('#reg-payment-sent');
  await guest.waitForTimeout(1500);
  has('le virement déclaré est enregistré',
      await guest.textContent('#reg-payment-status'), 'confirm your spot');

  // Et le paiement doit apparaître à l'admin, avec le nom de la personne.
  const pending = await page.evaluate(async ({ api }) => {
    const r = await fetch(`${api}/api/payments/pending`, { credentials: 'include' });
    return r.ok ? (await r.json()).data.payments.map((p) => `${p.first_name} ${p.last_name}`) : [];
  }, { api: API });
  check('ce paiement sans compte arrive dans la liste de l’admin',
        pending.includes('Sans Compte'), 'true');

  // Aucun profil ne doit avoir été créé pour cette personne.
  const created = await page.evaluate(async ({ api, mail }) => {
    const r = await fetch(`${api}/api/players/admin`, { credentials: 'include' });
    const b = await r.json();
    return b.data.players.filter((p) => p.email === mail).length;
  }, { api: API, mail });
  check('aucun profil n’a été créé pour elle', created, 0);

  await ctx2.close();

  console.log('');
  check('aucune erreur JavaScript sur les pages', pageErrors.length, 0);
  if (pageErrors.length) console.log(pageErrors.join('\n'));

  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`${pass} réussis, ${fail} échecs`);

  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((err) => {
  console.error('Le test s’est arrêté :', err.message);
  process.exit(1);
});
