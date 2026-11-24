const additions = {
  en: {
    contributions: 'Contributions', commits: 'Commits', pullRequests: 'Pull requests', mergedPullRequests: 'Merged PRs',
    issues: 'Issues opened', reviews: 'PRs reviewed', mergeRate: 'PR merge rate', contributedRepos: 'Recent contributor repos',
    discussions: 'Discussions started', answers: 'Accepted answers', activityScore: 'Activity score',
    publicContributions: 'Public GitHub contributions', visibleContributions: 'GitHub contributions · token scope',
    gists: 'Public gists', gistSubtitle: 'Code snippets on GitHub', emptyGists: 'No public gists match the selection.',
    files: 'Files', comments: 'Comments', selectedProjects: 'Public repositories · selected order',
    pinnedProjects: 'Public repositories pinned on GitHub', insights: 'Repository insights', insightSubtitle: 'Traffic and authored changes',
    views: 'Views · 14 days', uniqueViews: 'Unique views', additions: 'Lines added', deletions: 'Lines removed',
    insightCoverage: 'Coverage · traffic {traffic}/{total} · lines {lines}/{total}',
    coding: 'Coding time', languageTime: 'Time by language', emptyCoding: 'WakaTime stats are unavailable.',
    weightedLanguages: 'Weighted language share', languageBytes: 'Analyzed bytes by language',
    languageRepos: 'Repository occurrences', unavailable: 'Unavailable'
  },
  'pt-BR': {
    contributions: 'Contribuições', commits: 'Commits', pullRequests: 'Pull requests', mergedPullRequests: 'PRs mesclados',
    issues: 'Issues abertas', reviews: 'PRs revisados', mergeRate: 'Taxa de merge', contributedRepos: 'Repos contribuídos recentemente',
    discussions: 'Discussões iniciadas', answers: 'Respostas aceitas', activityScore: 'Pontuação de atividade',
    publicContributions: 'Contribuições públicas no GitHub', visibleContributions: 'Contribuições no escopo do token',
    gists: 'Gists públicos', gistSubtitle: 'Trechos de código no GitHub', emptyGists: 'Nenhum gist público na seleção.',
    files: 'Arquivos', comments: 'Comentários', selectedProjects: 'Repositórios públicos · ordem escolhida',
    pinnedProjects: 'Repositórios públicos fixados no GitHub', insights: 'Dados dos repositórios', insightSubtitle: 'Tráfego e alterações de sua autoria',
    views: 'Visitas · 14 dias', uniqueViews: 'Visitas únicas', additions: 'Linhas adicionadas', deletions: 'Linhas removidas',
    insightCoverage: 'Cobertura · tráfego {traffic}/{total} · linhas {lines}/{total}',
    coding: 'Tempo de programação', languageTime: 'Tempo por linguagem', emptyCoding: 'Estatísticas do WakaTime indisponíveis.',
    weightedLanguages: 'Proporção ponderada por linguagem', languageBytes: 'Bytes analisados por linguagem',
    languageRepos: 'Ocorrências em repositórios', unavailable: 'Indisponível'
  },
  es: {
    contributions: 'Contribuciones', commits: 'Commits', pullRequests: 'Pull requests', mergedPullRequests: 'PR fusionadas',
    issues: 'Incidencias abiertas', reviews: 'PR revisadas', mergeRate: 'Tasa de fusión', contributedRepos: 'Repos con aportes recientes',
    discussions: 'Debates iniciados', answers: 'Respuestas aceptadas', activityScore: 'Puntuación de actividad',
    publicContributions: 'Contribuciones públicas en GitHub', visibleContributions: 'Contribuciones en el alcance del token',
    gists: 'Gists públicos', gistSubtitle: 'Fragmentos de código en GitHub', emptyGists: 'No hay gists públicos en la selección.',
    files: 'Archivos', comments: 'Comentarios', selectedProjects: 'Repositorios públicos · orden elegido',
    pinnedProjects: 'Repositorios públicos fijados en GitHub', insights: 'Datos de repositorios', insightSubtitle: 'Tráfico y cambios de tu autoría',
    views: 'Vistas · 14 días', uniqueViews: 'Visitas únicas', additions: 'Líneas añadidas', deletions: 'Líneas eliminadas',
    insightCoverage: 'Cobertura · tráfico {traffic}/{total} · líneas {lines}/{total}',
    coding: 'Tiempo de programación', languageTime: 'Tiempo por lenguaje', emptyCoding: 'Estadísticas de WakaTime no disponibles.',
    weightedLanguages: 'Proporción ponderada por lenguaje', languageBytes: 'Bytes analizados por lenguaje',
    languageRepos: 'Presencia en repositorios', unavailable: 'No disponible'
  },
  fr: {
    contributions: 'Contributions', commits: 'Commits', pullRequests: 'Pull requests', mergedPullRequests: 'PR fusionnées',
    issues: 'Tickets ouverts', reviews: 'PR examinées', mergeRate: 'Taux de fusion', contributedRepos: 'Dépôts avec activité récente',
    discussions: 'Discussions lancées', answers: 'Réponses acceptées', activityScore: "Score d’activité",
    publicContributions: 'Contributions publiques sur GitHub', visibleContributions: 'Contributions visibles par le jeton',
    gists: 'Gists publics', gistSubtitle: 'Extraits de code sur GitHub', emptyGists: 'Aucun gist public dans la sélection.',
    files: 'Fichiers', comments: 'Commentaires', selectedProjects: 'Dépôts publics · ordre choisi',
    pinnedProjects: 'Dépôts publics épinglés sur GitHub', insights: 'Statistiques des dépôts', insightSubtitle: 'Trafic et modifications personnelles',
    views: 'Vues · 14 jours', uniqueViews: 'Visites uniques', additions: 'Lignes ajoutées', deletions: 'Lignes supprimées',
    insightCoverage: 'Couverture · trafic {traffic}/{total} · lignes {lines}/{total}',
    coding: 'Temps de programmation', languageTime: 'Temps par langage', emptyCoding: 'Statistiques WakaTime indisponibles.',
    weightedLanguages: 'Part pondérée par langage', languageBytes: 'Octets analysés par langage',
    languageRepos: 'Présence dans les dépôts', unavailable: 'Indisponible'
  }
}

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
    if (!Object.hasOwn(translations.en, key) && !Object.hasOwn(additions.en, key)) {
      throw new Error('Unknown StatVitra message key.')
    }
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
  const builtin = language === 'pt' ? 'pt-BR' : language
  const catalog = Object.hasOwn(translations, baseName) ? baseName : Object.hasOwn(translations, builtin) ? builtin : 'en'
  return { ...translations[catalog], ...additions[catalog], ...messages }
}
