// public/js/loader/admin-config.js
export async function applyAdminConfig() {
  // Nouveau chemin en priorité
  try {
    const { loadConfig, applyConfig } = await import('/js/config/index.js');
    applyConfig(loadConfig());
    return;
  } catch {}
  // Compat ancien chemin
  try {
    const { loadConfig, applyConfig } = await import('/js/config.js');
    applyConfig(loadConfig());
  } catch (e) {
    console.warn('[loader] Impossible d’appliquer la config admin:', e);
  }
}
