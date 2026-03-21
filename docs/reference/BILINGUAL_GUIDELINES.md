# Bilingual Voice, Tone & Terminology

## Brand Identity

- **Brand Name:** PolicyWallet (CamelCase, no spaces)
- **Tagline (Greek):** Ασφαλιστική Νοημοσύνη
- **Tagline (English):** Insurance Intelligence
- **Brand Promise:** "Η ολοκληρωμένη πλατφόρμα διαχείρισης ασφαλιστηρίων συμβολαίων με τεχνητή νοημοσύνη"

## Language Priority

1. Greek is the **primary** language
2. English is equally professional, not a translation
3. Both languages should feel native

## Voice & Tone

### Greek (Primary)

**Characteristics:**
- Επαγγελματικός (Professional)
- Αξιόπιστος (Trustworthy)
- Φιλικός (Friendly but formal)
- Σαφής (Clear and direct)

**Guidelines:**
- Use formal "εσείς" (you) form
- Avoid slang or colloquialisms
- Use proper insurance terminology
- Be concise but complete

**Examples:**
```
OK:  "Διαχειριστείτε τα συμβόλαιά σας με ασφάλεια"
BAD: "Φτιάξτε το πορτοφόλι σας" (too casual)

OK:  "Ανάλυση με τεχνητή νοημοσύνη"
BAD: "AI analysis" (don't mix languages)

OK:  "Ασφαλιστικός Σύμβουλος"
BAD: "Πράκτορας" (outdated term)
```

### English (Secondary)

**Characteristics:** Professional, Trustworthy, Accessible, Clear

**Guidelines:**
- Use active voice
- Avoid jargon when possible
- Be specific with insurance terms
- Keep sentences concise

**Examples:**
```
OK:  "Manage your policies securely"
BAD: "Manage your stuff safely"

OK:  "AI-powered coverage analysis"
BAD: "Smart AI thing for insurance"

OK:  "Insurance Advisor"
BAD: "Insurance Agent" (less professional)
```

## Key Terminology

| Greek | English | Notes |
|-------|---------|-------|
| Ασφαλιστήριο Συμβόλαιο | Insurance Policy | Formal term |
| Ασφαλιστικός Σύμβουλος | Insurance Advisor | Modern, professional |
| Κάλυψη | Coverage | Standard term |
| Ανανέωση | Renewal | Common usage |
| Αποζημίωση | Claim | Technical term |
| Ασφαλισμένος | Policyholder | Formal |
| Ασφαλιστής | Insurer | Company |

## Copy Implementation

```typescript
// Structure
{ el: "Πρωτότυπο ελληνικό κείμενο", en: "Original English text" }

// Usage
import { copy, getCopy } from '@/lib/copy'
const { language } = useLanguage()
const title = copy.landing.hero.title[language]
```

**Never:**
- Use Google Translate for copy
- Mix languages in the same sentence
- Assume Greek is a direct translation
- Use informal tone in either language
