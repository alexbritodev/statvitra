const translations = {
  en: {
    overview: 'Profile overview', languages: 'Top languages', projects: 'Featured projects',
    activity: 'Public activity', repos: 'Repositories', stars: 'Stars received', forks: 'Forks received',
    followers: 'Followers', scope: 'Public GitHub data', bytes: 'Share of analyzed bytes',
    forksMade: 'Forks made', following: 'Following', publicGists: 'Public gists',
    scanned: '{count} of {total} eligible repositories analyzed',
    projectsOrder: 'Public repositories ranked by stars',
    emptyLanguages: 'No language data for the selected repositories.',
    emptyProjects: 'No repositories match the selected filters.',
    unknown: 'Language unavailable', other: 'Other', events: 'public events',
    eventPeriod: 'Last 30 calendar days · UTC', today: 'Today', partial: 'Up to 300 events shown',
    textReport: 'Read the stats as text', demo: 'Sample data'
  },
  'pt-BR': {
    overview: 'Resumo do perfil', languages: 'Linguagens principais', projects: 'Projetos em destaque',
    activity: 'Atividade pública', repos: 'Repositórios', stars: 'Estrelas recebidas', forks: 'Forks recebidos',
    followers: 'Seguidores', scope: 'Dados públicos do GitHub', bytes: 'Proporção dos bytes analisados',
    forksMade: 'Forks feitos', following: 'Seguindo', publicGists: 'Gists públicos',
    scanned: '{count} de {total} repositórios elegíveis analisados',
    projectsOrder: 'Repositórios públicos ordenados por estrelas',
    emptyLanguages: 'Sem dados de linguagens para os filtros atuais.',
    emptyProjects: 'Sem repositórios para os filtros atuais.',
    unknown: 'Linguagem indisponível', other: 'Outras', events: 'eventos públicos',
    eventPeriod: 'Últimos 30 dias do calendário · UTC', today: 'Hoje', partial: 'Até 300 eventos exibidos',
    textReport: 'Ler as estatísticas em texto', demo: 'Dados de exemplo'
  },
  es: {
    overview: 'Resumen del perfil', languages: 'Lenguajes principales', projects: 'Proyectos destacados',
    activity: 'Actividad pública', repos: 'Repositorios', stars: 'Estrellas recibidas', forks: 'Forks recibidos',
    followers: 'Seguidores', scope: 'Datos públicos de GitHub', bytes: 'Proporción de bytes analizados',
    forksMade: 'Forks creados', following: 'Siguiendo', publicGists: 'Gists públicos',
    scanned: '{count} de {total} repositorios aptos analizados',
    projectsOrder: 'Repositorios ordenados por estrellas',
    emptyLanguages: 'Sin datos de lenguajes para los filtros actuales.',
    emptyProjects: 'Ningún repositorio coincide con los filtros.',
    unknown: 'Lenguaje no disponible', other: 'Otros', events: 'eventos públicos',
    eventPeriod: 'Últimos 30 días del calendario · UTC', today: 'Hoy', partial: 'Hasta 300 eventos mostrados',
    textReport: 'Leer las estadísticas en texto', demo: 'Datos de ejemplo'
  },
  fr: {
    overview: 'Aperçu du profil', languages: 'Langages principaux', projects: 'Projets à la une',
    activity: 'Activité publique', repos: 'Dépôts', stars: 'Étoiles reçues', forks: 'Forks reçus',
    followers: 'Abonnés', scope: 'Données publiques de GitHub', bytes: 'Part des octets analysés',
    forksMade: 'Forks créés', following: 'Abonnements', publicGists: 'Gists publics',
    scanned: '{count} dépôts analysés sur {total}',
    projectsOrder: 'Dépôts publics classés par étoiles',
    emptyLanguages: 'Aucune donnée de langage pour ces filtres.',
    emptyProjects: 'Aucun dépôt ne correspond aux filtres.',
    unknown: 'Langage indisponible', other: 'Autres', events: 'événements publics',
    eventPeriod: '30 derniers jours calendaires · UTC', today: "Aujourd’hui", partial: 'Jusqu’à 300 événements affichés',
    textReport: 'Lire les statistiques au format texte', demo: 'Données de démonstration'
  }
}

export function validateMessages(messages) {
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) {
    throw new Error('messages must be a JSON object.')
  }
  return Object.fromEntries(Object.entries(messages).map(([key, value]) => {
    if (!Object.hasOwn(translations.en, key)) throw new Error('Unknown StatVitra message key.')
    if (typeof value !== 'string' || !value.trim() || /[\p{Cc}\u2028\u2029]/u.test(value)) {
      throw new Error('Each StatVitra message must be a nonempty, single-line string.')
    }
    if (key === 'scanned' && (!value.includes('{count}') || !value.includes('{total}'))) {
      throw new Error('The scanned message requires {count} and {total}.')
    }
    return [key, value.trim()]
  }))
}

export function copyFor(locale, messages) {
  const { baseName, language } = new Intl.Locale(locale)
  const builtin = language === 'pt' ? translations['pt-BR'] : translations[language]
  return { ...(translations[baseName] ?? builtin ?? translations.en), ...messages }
}
