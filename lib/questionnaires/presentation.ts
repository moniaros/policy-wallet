/** Only authored system titles are translated. Agent-authored titles remain verbatim. */
const titles: Record<string, { el: string; en: string }> = {
    'tpl-motor-intake': { el: 'Στοιχεία ασφάλισης οχήματος', en: 'Motor Insurance Intake' },
    'tpl-home-assessment': { el: 'Έλεγχος αναγκών κατοικίας', en: 'Home Insurance Assessment' },
    'tpl-health-needs': { el: 'Ανάγκες ασφάλισης υγείας', en: 'Health Insurance Needs Analysis' },
    'tpl-life-review': { el: 'Έλεγχος ασφάλισης ζωής', en: 'Life Insurance Review' },
    'tpl-pet-coverage': { el: 'Ασφάλιση κατοικιδίου', en: 'Pet Insurance Questionnaire' },
    'tpl-travel-intake': { el: 'Στοιχεία ταξιδιωτικής ασφάλισης', en: 'Travel Insurance Intake' },
    'tpl-annual-review': { el: 'Ετήσιος έλεγχος ασφαλιστικών αναγκών', en: 'Annual Insurance Needs Review' },
    'tpl-risk-profile': { el: 'Ανάγκες προστασίας νοικοκυριού', en: 'Household Risk Profile' },
}
export function questionnaireTitle(template: { id?: string; name: string; isSystem?: boolean }, language: string) {
    return template.isSystem && template.id && titles[template.id] ? titles[template.id][language === 'en' ? 'en' : 'el'] : template.name
}
