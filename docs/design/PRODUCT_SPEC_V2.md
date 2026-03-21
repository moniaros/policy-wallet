POLICYWALLET
Product Specification  v2.0
Front-End Development — User Journeys, UI/UX & Feature Specifications
Version
2.0	Status
Ready for Development	Audience
Front-End Team
 
1. Product Overview
PolicyWallet is a mobile-first insurance management platform that acts as a single, secure digital vault for all of a user's insurance policies. It combines document storage, AI-powered policy analysis, proactive reminders, family sharing, and direct agent connectivity into one seamless experience.

The core value proposition rests on three pillars:
•	Simplicity — one app replacing multiple insurer apps and scattered PDFs.
•	Intelligence — AI that translates complex policy language into plain-language insights, surfaces savings, and detects coverage gaps.
•	Peace of mind — proactive reminders, family sharing, and professional agent connectivity.

Subscription value:  Users recover the €9.99/month subscription cost within 2 months through AI-detected savings (duplicate coverage, unused benefits, premium optimisation). The UI must continuously reinforce this value.

2. Target User Persona

Primary Persona:  The Busy Urban Professional — a city-dweller (e.g., Athens) juggling 3–5 policies across different insurers. Time-poor, digitally comfortable, GDPR-conscious, and frustrated with disorganised insurance paperwork. Motivated by savings, convenience, and security.

Key persona characteristics that must inform all UI decisions:
•	Owns 3–5 policies across different insurers (Motor, Health, Home, Life, and potentially Pet).
•	Previously managed policies via email folders, gloveboxes, and insecure messaging apps (WhatsApp/Viber).
•	Interacts with the app roughly twice a month — once to check a payment date, once to look up a specific coverage detail.
•	Values biometric login; finds repeated password entry a major friction point.
•	Shares the app with a spouse/partner for family-level policy visibility.
•	Has an existing insurance agent relationship they want to preserve and improve.

3. Discovery & Signup Flow
Users arrive primarily through social/content channels (tech blogs, targeted social ads). The messaging that converts them centres on 'digitalisation of insurance' and the AI analysis hook ('find out if you're really covered').

3.1 Sign-Up Screen
•	Social proof element visible on the first screen (number of users, GDPR badge).
•	Clear, prominent messaging around GDPR compliance and data security — this is a primary motivator.
•	Simple email/phone registration. No third-party government auth on signup.
•	After account creation, immediately transition to the Welcome Tour.

3.2 Welcome Tour (3 Steps)
Exactly 3 steps. Purpose: personalise the experience and deliver the first 'wow' moment immediately.

Step	Content & UI Requirement
Step 1 — Intent Capture	Ask: 'What matters most to you?' Present 3 selectable tiles: Save Money, Health & Family, My Car. The selection personalises dashboard card order and first AI prompt.
Step 2 — First Upload Prompt	Prompt: 'Upload your first policy to see the magic.' Large '+' upload button. Accept PDF. Use reassuring copy: 'Your document is encrypted and private.'
Step 3 — AI Summary	Animated progress state as AI reads the document (~20 seconds). Display extracted summary. CTA: 'Go to My Wallet'.

4. Login Experience
•	Primary login method: Biometric (Face ID / fingerprint). Default and first-presented option on all supported devices.
•	PIN fallback available. Password/email login available but secondary — do not surface it prominently.
•	Session persistence: users should not be asked to re-authenticate within 30 days of inactivity.
•	No government authentication portals for routine login.

5. Home Dashboard
The dashboard is the user's command centre. It must communicate the user's complete insurance status at a glance and surface the most time-sensitive action in the first viewport.

5.1 Dashboard — 10 Required Elements

UI Element	Description & Behaviour
1. Total Active Policies Counter	Large number at top of screen. E.g., '4 Active Policies'. Tapping navigates to My Wallet.
2. Coverage Progress Circle	Circular donut chart representing overall protection completeness. Color-coded: green = well covered, amber = gaps detected. Tapping opens AI Insights.
3. Upcoming Renewals Timeline	Horizontal scrollable timeline of the next 3 renewal/payment dates. Each card: policy type icon, insurer name, date, premium amount.
4. AI Insight Card	Contextual 'Did you know?' tip card, dynamically generated from the user's policies. Dismissable. Refreshes periodically.
5. Quick Upload Button (+)	Centrally-placed floating action button (FAB). The primary action of the app. Always visible.
6. Recent Documents	Horizontally scrollable row of recently uploaded/modified policies. Thumbnail + policy name. Tapping opens the document.
7. Agent Link Status	Persistent status indicator (green icon + agent name) showing agent connection. Tapping opens the Agent section.
8. Health Check-up Reminder	Specific nudge card for health benefits. Only shown if user has a health policy with such benefits.
9. Savings Opportunities Badge	Card with '€' icon and teaser text highlighting a detected saving. Appears above fold if a saving is detected.
10. Help / Support Chat Link	Persistent help button. Opens in-app support chat.

5.2 Bottom Navigation

Tab	Destination
Home	Dashboard
My Wallet	Full policy portfolio list
AI Insights	Full gap analysis and insight view
My Agent	Agent connectivity and document sharing
Settings	Account, notifications, security, family sharing

 
6. Policy Card System (Quick View)
Each policy type in My Wallet is represented by a type-specific quick-view card. These cards answer the primary user question: 'Am I covered?' The card system must be visually distinct per policy type while maintaining a consistent structural pattern.

Card Design Principle:  Every card must answer the most time-critical question for that policy type within the card itself — without requiring the user to open the full detail view. Think: glanceable, not exhaustive.

6.1 Health Policy Card

Health Card Fields
Hospital Class	Display room class level: A, B, or C. Badge-style indicator. This is the most frequently referenced field for Health.
Coordination Centre	Show the Συντονιστικό Κέντρο (coordination centre) name and phone number. Tap-to-call. Critical for network navigation.
Annual Check-up Status	Badge: 'Included' or 'Not Included'. If included and unused this year, show a nudge indicator.
Direct Billing Status	On/off badge: 'Direct Billing Available'. If on, links to hospital network list.

6.2 Motor (Auto) Policy Card

Motor Card Fields
Vehicle Identifier	License plate number + vehicle make/model. Prominently displayed.
Coverage Tier	E.g., 'Third Party' / 'Third Party + Fire & Theft' / 'Comprehensive'. Color-coded badge.
Green Card Validity	Expiry date of the international insurance certificate. Warning badge if expiring within 30 days.
Named Drivers	List of named drivers on the policy. Expandable if more than 2.

6.3 Home Policy Card

Home Card Fields
Property Address	Full insured address. Tap to copy.
ENFIA Tax Deduction Badge	Badge indicator: 'ENFIA Eligible' or 'Not Eligible'. Based on whether the policy meets Fire + Earthquake + Flood criteria. High relevance in the Greek market.
Catastrophe Coverage	Three separate on/off badges: Fire, Earthquake, Flood. Visual traffic-light style.
Insured Value	Displayed property value. Warning badge if potentially underinsured vs. construction cost index.

6.4 Investment Life Policy Card

Investment Life Card Fields
Current Fund Value	Live or last-updated fund value in euros. Prominent display.
YTD Growth	Year-to-date growth percentage. Green if positive, red if negative.
Tax-Free Maturity Status	Badge: 'Tax-Free at Maturity' or 'Taxable'. Key value indicator.
Guaranteed vs. Unit-Linked Split	Visual split bar (e.g., 60% guaranteed / 40% unit-linked). Helps user understand risk exposure at a glance.

6.5 Pet Insurance Card

Pet Insurance Card Fields
Microchip Number	Pet's microchip ID. Tap to copy. Critical for vet visits.
Annual Limit Progress	Progress bar: amount used vs. annual coverage limit. E.g., '€320 used of €1,500.'
Breed-Specific Disease Coverage	Key condition badge. Specifically: Leishmania (Κάλαζαρ) coverage status. On/off badge — highly relevant in the Greek context.
Direct Payment Status	Badge: 'Direct Vet Payment' available or not.

 
7. Detailed Coverage Views
The full policy detail view answers two deeper questions: 'What exactly is covered?' and 'How do I use it?' It transforms a 20-page legal PDF into a structured, plain-language summary. The first time a user views this screen is a pivotal product moment — the design must feel genuinely revelatory.

Layout Structure:  The view is split into two primary tabs: 'What's Covered' (positive coverage list) and 'What's NOT Covered' (exclusions, clearly labeled). All content must be in plain language — no insurance jargon without a tooltip explanation.

7.1 Health — Detailed View

Field / Feature	UI Requirement
Coordination Centre (Συντονιστικό Κέντρο)	Name, phone number (tap-to-call), and operating hours. Explain its role in a plain-language tooltip: 'Call this number before any planned hospital visit to coordinate your coverage.'
Network Hospital List	Searchable, filterable list of covered hospitals. Filter by: city, specialty, direct billing. Tap to open in maps.
Excluded Providers	Clearly labeled list of excluded hospitals or providers. Visually distinct (e.g., grey with strikethrough or red badge).
Free Annual Check-up	Prominent card: 'Your plan includes a free annual check-up.' Status: Used / Not Used this year. CTA: 'Book Now' (links to coordination centre).
Waiting Periods	Per-benefit waiting period clearly labeled with end dates. E.g., 'Maternity: covered from 1 Jan 2025.'
Outpatient Coverage Limit	Remaining limit displayed as a progress bar: 'Used €450 of €2,000.'
Deductible Per Claim	Displayed clearly per benefit category.

7.2 Motor (Auto) — Detailed View

Field / Feature	UI Requirement
Accident Declaration (Δήλωση Ατυχήματος)	Dedicated prominent button/card with phone number (tap-to-call). Must be visually distinct from Roadside Assistance — these are different services with different numbers. Do not combine.
Roadside Assistance (Οδική Βοήθεια)	Separate prominent button/card with its own phone number (tap-to-call). Labelled clearly as Roadside Assistance. Cited by users as 'crucial.' Should be reachable in 1 tap.
Named Drivers	Full list with names and ages. Editable with a note field.
Green Card Status	Validity dates. Download button for the digital green card image.
Third-Party Liability Limits	Per-person and per-event limits. Plain-language explanation of what this means.
Own Vehicle Damage	Coverage status and deductible. On/off badge.
Glass / Screen Breakage	On/off coverage badge. Separate deductible if applicable.

7.3 Home — Detailed View

Field / Feature	UI Requirement
ENFIA Tax Criteria Validation	Interactive checklist: Fire covered? (tick/cross), Earthquake covered? (tick/cross), Flood covered? (tick/cross). If all three met: 'ENFIA Eligible' badge. Plain-language explanation of the deduction benefit.
Catastrophe Coverage Status	Dedicated section with on/off status per peril: Fire, Earthquake (flagged as critical for Athens), Flood. Gap alert if any are off.
Mortgagee Bank	If applicable: bank name and policy assignment details. Informs the user their insurer may need to notify the bank on changes.
24/7 Technical Assistance	Dedicated card with phone number (tap-to-call). Services list: plumber, electrician, locksmith, etc.
Theft Coverage Limit	Amount displayed. Plain-language note on what qualifies as covered theft.
Insured vs. Replacement Value	Side-by-side comparison. Warning if insured value is below the construction cost index benchmark.
Contents vs. Structure Coverage	Clearly split: what covers the building vs. what covers possessions.

7.4 Investment Life — Detailed View

Field / Feature	UI Requirement
Fund Allocation Breakdown	Visual pie or bar chart: allocation by fund name and percentage. Tap a segment to see fund details.
Guaranteed vs. Unit-Linked Split	Prominent split visualisation. Plain-language explanation of the difference and risk profile.
Beneficiaries	Named beneficiaries with percentages. Editable via 'Request Change' CTA (links to agent or insurer form).
Last Premium Details	Amount, date paid, next due date.
Tax-Free Maturity Information	Eligibility status with plain-language explanation of the 10-year rule (Greek tax law context).
Goal Timeline Visualisation	Chart: target maturity value vs. current projected path. Updated with YTD performance.
Surrender Value	Current surrender value with warning about early exit penalties.

7.5 Pet Insurance — Detailed View

Field / Feature	UI Requirement
Breed Health Radar	Visual radar/spider chart showing breed-specific health risk profile. E.g., for Labrador: high hip dysplasia risk, moderate eye conditions. Sourced from breed health data.
Covered Hereditary Conditions	List of covered breed-specific hereditary conditions. Green tick per item.
Uncovered Hereditary Conditions	List of exclusions specific to the breed. Red cross per item. Plain-language explanation of why.
Leishmania (Κάλαζαρ) Coverage	Dedicated badge: Covered / Not Covered. Given the prevalence in Greece, this must be prominently displayed and not buried in a list.
Vet Network	Searchable list of partner vets. Filter by: city, specialty, direct payment status.
Direct Payment Status	If available: vets that accept direct billing are tagged 'Direct Pay.' Explained in plain language.
Waiting Period Status	Per-condition waiting period tracker. Progress bar per condition showing when coverage activates.
Annual Limit Progress	Detailed breakdown: €X used of €Y total, with per-category sub-limits if applicable.

 
8. Dynamic Gap Analysis Engine
The Gap Analysis Engine is the primary revenue-generating feature of PolicyWallet. It analyses each policy against benchmarks, usage patterns, and cross-policy data to surface personalised recommendations. From a UI perspective, this must feel like a trusted financial advisor — not an upsell machine. Every insight must explain the user's risk or saving in plain language before presenting a CTA.

⚠️  UX Critical Requirement
All gap analysis insights must lead with the user's benefit (save money, avoid risk) — never with a product pitch. The CTA should be 'Ask Your Agent' or 'Learn More', not 'Buy Now.' Trust is the product.

8.1 Gap Analysis — Home & Liability

Home & Liability Insurance    Revenue opportunity: €150–400/year opportunity
•	Construction Cost Index Comparison: Compare the user's insured property value against the current construction cost benchmark (€1,600/sqm in Athens). If underinsured, display a gap calculation with plain-language risk explanation.
•	Safe Replacement Value Slider: Interactive slider visualisation allowing the user to see how their coverage maps to actual replacement cost. Shows the coverage gap in euros.
•	ENFIA Tax Criteria Validation: Check whether the policy meets all three ENFIA deduction criteria (Fire + Earthquake + Flood). If criteria are not fully met, display a 'ENFIA Gap' alert with estimated tax saving if corrected.
•	Gap Alert CTA: 'Ask Your Agent to Review' — pre-fills a message to the agent with the detected gap details.

8.2 Gap Analysis — Motor (Auto)

Motor Insurance    Revenue opportunity: €200–600/year opportunity
•	Vehicle Depreciation Analysis: Compare the current coverage level against the vehicle's current market value. Flag if the vehicle is overinsured (paying for comprehensive on a low-value vehicle) or underinsured.
•	Overinsurance Detection: If detected, display: 'You may be wasting €X/year on comprehensive coverage for a vehicle worth €Y. Third-party may be more cost-effective.'
•	Underinsurance Risk Display: If detected, display: 'In a total loss scenario, you could lose €Y. Your coverage may not fully protect you.'
•	Legal Protection Coverage Check: Compare current legal protection limit against average court cost benchmarks for motor claims in Greece. Flag if legal protection is absent or insufficient.
•	Market Value Meter Visualisation: Visual gauge showing the vehicle's current estimated market value vs. insured value. Colour-coded: green = aligned, amber = review, red = significant gap.

8.3 Gap Analysis — Health

Health Insurance    Revenue opportunity: €180–400/year opportunity
•	Hospital Cost Simulation: Interactive scenario — '5-day surgery (e.g., appendectomy).' Show estimated total hospital cost vs. what the policy covers. Display the out-of-pocket amount in large, clear text.
•	Out-of-Pocket Calculation: Deductible + co-payment + non-covered items = total user cost per scenario. Make the financial exposure tangible.
•	Deductible vs. Emergency Savings Gap Analysis: If the user's deductible exceeds a reasonable emergency savings benchmark, flag this as a financial risk. Suggest either increasing coverage or acknowledging the gap.
•	Room Class Upgrade Analysis: Show the cost difference between current hospital class (e.g., B) and upgrading to A, vs. the real-world comfort and coverage difference.

8.4 Gap Analysis — Investment Life

Investment Life    Revenue opportunity: €250–800/year opportunity
•	Goal Timeline Visualisation: Chart showing the target maturity value (user's financial goal) vs. the current projected path based on fund performance. Update dynamically with YTD data.
•	Purchasing Power Erosion Analysis: Show the inflation-adjusted real value of the policy's projected payout. E.g., '€100,000 at maturity in 2035 has the purchasing power of €78,000 today.'
•	Inflation-Adjusted Shortfall Calculation: If the projected real value falls short of the user's goal, display the shortfall and suggest a contribution increase.
•	Premium Holiday Impact: If the user has taken premium holidays, show the impact on projected maturity value.

8.5 Gap Analysis — Pet Insurance

Pet Insurance    Revenue opportunity: €80–150/year opportunity
•	Breed-Specific Hereditary Condition Radar: Visual radar chart mapping the pet's breed against common hereditary conditions. Overlay which conditions are and are not covered by the current policy.
•	Waiting Period Status Tracking: Per-condition progress tracker. For each major condition, show: 'Covered from [date]' or 'Waiting period ends in X days.'
•	Greek Disease Coverage (Leishmania / Κάλαζαρ): Specific gap check — is Leishmania covered? Given Greece's prevalence, flag this as a high-priority gap if not covered.
•	Annual Limit Adequacy: Compare the annual limit against average annual vet costs for the breed. Flag if the limit is likely to be insufficient based on breed health data.

8.6 Gap Analysis — Doctor Civil Liability

Doctor Civil Liability    Revenue opportunity: €500–1,500/year opportunity
•	Career Protection Timeline: Visual timeline showing the doctor's career span with unprotected years highlighted. Emphasis on retroactive coverage gaps — years practised without liability cover create permanent exposure.
•	Retroactive Coverage Gap Detection: Identify periods of practice not covered by current retroactive cover. Display the number of unprotected years and the risk this represents.
•	Specialty-Specific Settlement Benchmarks: Show average malpractice settlement amounts for the doctor's specialty in Greece. Makes the financial exposure concrete and personal.
•	Coverage Limit Adequacy: Compare current coverage limit against specialty benchmarks. Flag if underinsured relative to specialty risk.

8.7 Gap Analysis — Marine (Yacht)

Marine / Yacht Insurance    Revenue opportunity: €300–500/year opportunity
•	Cruising Area Warranty Verification: Check the policy's declared cruising area against the owner's actual or intended routes. Flag any mismatch — sailing outside the warranted area voids coverage.
•	Tender (Dinghy) Coverage Detection: Check whether the tender/dinghy is separately listed and covered. This is commonly omitted and represents a meaningful gap.
•	Area Mismatch Savings Identification: If the declared cruising area is larger than the user's actual sailing patterns, flag the potential premium saving from reducing the area warranty.
•	Mooring Coverage Check: Verify coverage while the vessel is moored or laid up, not just while sailing.

 
9. Health & Wellness Module
The Health & Wellness module extends PolicyWallet beyond reactive policy management into proactive health engagement. It is tied to the user's health insurance policy and surfaces personalised preventive care actions. This module supports the core subscription value argument: the app actively helps users use benefits they are already paying for.

9.1 Annual Health Check-up Tracker
•	Per health policy, display the annual check-up benefit status: Available / Scheduled / Completed.
•	If available and not yet used: prominent nudge card on the dashboard and within the health policy detail view.
•	CTA: 'Book Check-up' — initiates contact with the coordination centre or links to a booking flow.
•	History log: past check-ups with dates and outcomes (user-entered or synced from coordination centre if available).

9.2 Health Risk Assessment
•	Optional self-assessment flow. User answers a brief questionnaire (age, lifestyle factors, family history).
•	Output: a risk score from 0–100 per health category (cardiovascular, metabolic, musculoskeletal, etc.).
•	Score display: visual gauge/speedometer per category. Plain-language interpretation of the score.
•	Personalised recommendations tied to the score: e.g., 'Your cardiovascular risk score suggests a lipid panel is advisable. Your policy covers this — book it now.'
•	Reassessment prompt: every 6–12 months, prompt the user to retake the assessment.

9.3 Preventive Care Recommendations
•	A personalised care calendar based on the user's age, gender, risk scores, and policy coverage.
•	Each recommendation card shows: the test/screening name, why it is recommended, whether it is covered by the user's policy, and a CTA to book or learn more.
•	Examples: annual dental cleaning (if covered), mammogram (age/gender appropriate), colonoscopy (age-based recommendation), blood pressure check.
•	Completed items can be marked as done and archived.
•	The module visually connects benefit utilisation to the subscription value proposition: 'Using these benefits = getting your subscription cost back.'

10. My Wallet — Policy Portfolio
My Wallet is the user's primary repository. It contains all uploaded policies, organised by category. This is the screen users visit to find a specific coverage detail or look up a phone number.

10.1 Portfolio List View
•	Policies grouped by category with distinct icon per type: Motor, Health, Home, Life/Investment, Pet, Doctor Liability, Marine, Other.
•	Each policy card shows: insurer logo/name, policy nickname (editable), policy number, expiry date, and a status dot (active / expiring soon / expired).
•	Persistent search bar at the top. Search by keyword finds coverage terms within policies.
•	Filter/sort control: by type, by renewal date, by insurer.

10.2 Upload Flow

Step	UI Requirement
1. Category Selection	Prompt: 'What type of policy is this?' Show large icon tiles: Motor, Health, Home, Life/Investment, Pet, Doctor Liability, Marine, Other.
2. File Selection	Open native file picker. Accept PDF. Also support camera capture for physical documents.
3. AI Processing	Animated progress state: 'Reading your policy...' Up to ~20 seconds. Branded animation — not a blank spinner.
4. AI Summary Confirmation	Display extracted key fields for user to confirm. User can edit any field. CTA: 'Save to Wallet.'
5. Success State	Celebratory micro-animation. Offer: 'Analyse Coverage' or 'Share with Agent.'

10.3 Policy Detail View — Universal Fields
The following fields are common to all policy types and must appear in every detail view:

Field	UI Requirement
Renewal / Expiry Date	Prominent. Warning badge if within 30 days.
Premium Amount	Annual and monthly equivalents shown.
Policy Number	Tap to copy.
Customer Support Phone	Tap-to-call. Labelled clearly per function (claims, roadside, coordination centre).
AI Gap Alert	Highlighted banner at the top of the detail view if a gap is detected. Colour-coded by severity.
Add Note	Free-text annotation field. Personal — not shared with agent unless explicitly sent.
Compare	Side-by-side comparison with previous policy version. Available at renewal time.

11. AI Insights
The AI Insights section delivers cross-policy intelligence in plain language. It must feel proactive, helpful, and personalised — not generic or alarming.

Insight Type	Example & UI Treatment
Gap Alert (Red/Amber badge)	'You lack Flood coverage. Your home is in a high-risk area.' — Red/amber card. CTA: 'Ask Your Agent.'
Savings Opportunity (Green / € icon)	'Duplicate Roadside Assistance detected on Motor + Home. Cancelling one saves ~€35/year.' — Green card. CTA: 'Review Duplicate.'
Benefit Reminder (Blue)	'Your health policy includes a free annual dental cleaning. Not used this year.' — Blue card. CTA: 'View Benefit Details.'
ENFIA Opportunity (Purple)	'Adding Flood coverage to your Home policy could make you eligible for the ENFIA tax deduction.' — Purple card. High financial impact.
Health Risk (Amber)	'Your risk assessment suggests scheduling a cardiovascular check-up. Your policy covers it.' — Amber card. CTA: 'Book via Coordination Centre.'

12. My Agent
The agent connectivity feature bridges the user's digital wallet with their insurance professional. The UI must make selective sharing intuitive and safe — users' primary concern is losing control over what the agent can see.

12.1 Connection Status
•	Clear status indicator: Connected (green) / Not Connected (grey).
•	Agent's name, photo (if available), and contact info displayed when connected.
•	'Last activity' timestamp: e.g., 'Your agent added a document 2 days ago.'

12.2 Granular Sharing Controls
•	Per-policy sharing toggle: each policy has an on/off toggle for agent visibility.
•	Example: Motor = Shared, Home = Shared, Life = Private. Visual distinction between shared and private policies.
•	A clearly labelled 'What your agent can see' summary view.

12.3 Agent Actions
•	Agent uploads a document (e.g., updated Green Card) → user gets push notification: 'Your agent has added a new document.'
•	Agent flags a change → user sees highlighted items in the policy detail view.
•	User can send a specific document to their agent via 'Share with Agent' CTA from within any policy.
•	In-app communication log: simple thread showing document exchanges between user and agent.

13. Family Sharing
•	A user can invite a family member (spouse/partner) to share their Wallet via email or phone.
•	Both users have equal access to upload, view, and manage all shared policies.
•	Individual policies can remain private if desired.
•	Children's health insurance cards are a primary use case — easily findable and downloadable.
•	Notifications are mirrored to all wallet members.

14. Notifications & Reminders

Notification Type	Timing & Content
Renewal Reminder	30 days, 7 days, and 3 days before expiry. Message: 'Your [Policy] with [Insurer] expires on [Date]. Premium: €[Amount].' CTA: 'Renew Now.'
Grace Period Alert	On renewal date if not yet renewed: 'You are within your grace period. Renew today to stay covered.'
Agent Activity	Immediate: 'Your agent has added/updated a document in your Wallet.'
AI Insight	Weekly max: New savings opportunity or gap detected.
Benefit Reminder	Annually: 'Your annual health check-up benefit is available. Have you used it?'
Health Risk Alert	Based on assessment score: 'Your risk profile suggests scheduling [screening]. It is covered by your policy.'
ENFIA Opportunity	Seasonal (pre-ENFIA period): 'Check if your Home policy qualifies for the ENFIA deduction.'
Green Card Expiry	30 days before: 'Your Green Card expires on [date]. Download or request a new one.'

15. Export & Utility Features

15.1 Export Portfolio
Generates a structured PDF summary of all active policies. Use cases: accountant, financial advisor, personal records. Includes: policy list, premium amounts, renewal dates, and key coverage highlights.

15.2 Policy Comparison
Side-by-side comparison view triggered by 'Compare' CTA in policy detail. Compares current policy vs. previous version. Highlights changes in premium, coverage limits, and deductibles in a clear diff format.

15.3 Digital Card Download
For Motor: 'Download Card' generates a digital insurance card image (saved to camera roll). For Health: generates a digital health membership card. Both shareable via the phone's native share sheet.

16. Global UX & Design Principles

Principle	Implementation Guidance
Plain Language First	All AI content, policy summaries, and UI copy must use plain, everyday language. Complex terms (e.g., 'deductible', 'unit-linked') must always have a plain-language tooltip.
Speed & Immediacy	Key information (renewal date, phone number, coverage status) must be reachable in 2 taps or fewer from the dashboard.
Trust & Security	GDPR compliance badges, encryption messaging, and granular sharing controls must be visible at key moments: upload, sharing, agent connection.
Proactive over Reactive	The app surfaces important information before the user needs to search for it. Reminders, AI cards, and agent notifications are the product working for the user.
Mobile-First	All layouts and touch targets designed for one-handed mobile use. Minimum touch target: 44x44pt.
Biometric-First Auth	Never show a password screen as primary login. Biometrics are the default.
Family-Aware	All flows and notifications designed with the assumption that 2 adults may share a wallet.
Never Upsell First	Gap analysis and AI insights must always lead with the user's benefit or risk — never with a product pitch. CTA: 'Ask Your Agent' not 'Buy Now.'
Greece-Specific Context	UI must acknowledge Greek-specific elements: ENFIA deduction, Leishmania coverage, Athens earthquake risk, Δήλωση Ατυχήματος vs Οδική Βοήθεια distinction, TaxisNet friction avoidance.

17. Key User Journey Summaries

Journey 1: New User First Upload
Download app → Sign up → 3-step Welcome Tour (intent capture) → Upload first policy → AI reads document (~20s) → View AI summary → Dashboard. Ends with the user seeing their policy data in a clean, readable format.

Journey 2: Routine Policy Lookup
Open app (biometric) → Dashboard → Tap policy card in Recent Documents → Policy Detail View → Find coverage detail or phone number. Target: 3 taps from app open to information found.

Journey 3: Sharing a Document with Agent
My Wallet → Select policy → 'Share with Agent' → Confirm agent → Sent confirmation. Agent receives notification and accesses the document.

Journey 4: Acting on a Savings Insight
Notification: 'Duplicate Roadside Assistance found' → AI Insights → View insight card → 'Ask Your Agent' → Agent reviews and advises.

Journey 5: Renewal Reminder Response
Push notification (7 days before expiry) → Dashboard Upcoming Renewals → 'Renew Now' → Insurer payment page (external) → User completes renewal → Policy marked renewed.

Journey 6: Agent Uploads a New Document
Agent uploads updated Green Card → User receives push notification → My Wallet → New document visible with agent-uploaded badge → User views and confirms.

Journey 7: Gap Analysis Discovery
Dashboard → Savings Opportunities badge → AI Insights → Home gap analysis: 'Your property is insured for €80,000 below replacement cost. Risk in total loss: -€80,000.' → 'Ask Your Agent' CTA → Pre-filled message sent to agent.

Journey 8: ENFIA Tax Deduction Check
Notification (pre-ENFIA season) → Home policy detail view → ENFIA criteria checklist → Fire: covered, Earthquake: covered, Flood: NOT covered → Gap alert displayed → 'Ask Your Agent to Add Flood Coverage' → If added: ENFIA badge updates to 'Eligible.'

Journey 9: Health Risk Assessment
Health & Wellness tab → 'Take Risk Assessment' → Brief questionnaire → Risk scores displayed per category → Personalised recommendations shown → 'This check-up is covered by your policy' → CTA to book via coordination centre.

Journey 10: Pet Leishmania Coverage Check
Pet insurance card → Breed health radar → Leishmania badge: 'Not Covered' → AI Gap Alert: 'Leishmania is prevalent in Greece. Your policy does not cover this condition.' → 'Ask Your Agent to Review' CTA.

 
18. Platform & Delivery Model
PolicyWallet is delivered as a Mobile-First Progressive Web App (PWA). This is a foundational product decision that directly affects how certain features are built and what the front-end team should expect from the platform.

18.1 What PWA Means for the Front-End Team
A PWA runs inside the mobile browser — it is not a native iOS or Android app. Users install it to their home screen via the browser's 'Add to Home Screen' prompt. This has direct implications for several product features:

Feature	PWA Implication
Biometric Login (Face ID / Touch ID)	Cannot use native iOS/Android biometric SDKs. Must be implemented using the Web Authentication API (WebAuthn / FIDO2) with Passkeys. When the user registers a Passkey, the OS-level biometric sheet (Face ID prompt) appears natively inside the browser context on repeat logins. The experience is visually identical to native — but the implementation path is WebAuthn, not a native SDK call.
Push Notifications	Delivered via the Web Push API, not APNs (Apple) or FCM (Google) directly. Users must grant notification permission from the browser. On iOS, this requires the PWA to be installed to the home screen first — notifications do not work from Safari tabs. The front-end must prompt installation before attempting to register for push notifications on iOS.
File Upload (Camera / Files)	Access to the device camera and file system works via the standard HTML file input with 'capture' attribute. No native file picker SDK required.
Offline / Cached Access	A service worker must cache critical policy data (renewal dates, key phone numbers) for offline access. Users in areas with poor connectivity (e.g., roadside) must be able to view their Roadside Assistance number without a live connection.
Home Screen Install Prompt	The app must prompt users to install it to their home screen during or shortly after onboarding. Installation is a prerequisite for push notifications on iOS. The front-end must handle the beforeinstallprompt event and present a branded install CTA.

19. Authentication & Session Behaviour
Authentication is handled by Supabase Auth using JWT-minted sessions. The front-end team must design all auth flows around the following confirmed decisions.

19.1 Login Flow — WebAuthn Passkey Sequence
The biometric login experience the product spec requires is delivered through the following sequence. The front-end team must implement each step:

Step	Front-End Requirement
1. First-time Registration	After email/phone signup, prompt the user to register a Passkey. Use the navigator.credentials.create() WebAuthn API call. The OS biometric prompt appears automatically. The Passkey is tied to the user's Supabase Auth identity server-side.
2. Repeat Login	On app open, call navigator.credentials.get() to trigger the OS biometric sheet. On success, exchange the WebAuthn assertion for a Supabase session token. The user never sees a password field.
3. Fallback Path	If WebAuthn is unavailable or the user declines Passkey setup, fall back to a PIN entry screen. Email/password login is available but must not be the first-presented option.
4. Session Persistence	Supabase JWT sessions persist for 30 days of inactivity. The front-end should silently refresh the session token on app open without prompting the user to re-authenticate within this window.
5. NextAuth Removal	NextAuth is a legacy dependency in the codebase. It is superseded by Supabase Auth. Do not use NextAuth APIs or hooks. Use the Supabase client exclusively for all auth operations.

19.2 Role-Based UI — Policyholder vs. Agent
Both Policyholders and Agents use the same application. The UI adapts based on the 'agent' role in the authenticated user's JWT. The front-end team must implement role-based rendering without building a separate application.
•	Check for the 'agent' role in authResult.dbUser.roles on every protected page render.
•	Policyholder view: standard dashboard, My Wallet, AI Insights, My Agent tab.
•	Agent view: replaces 'My Wallet' with 'My Clients' — a list of policyholders linked via the CustomerRelationship table. Agent can view only policies where an AccessGrant record exists for that relationship.
•	Agents cannot see policies the user has toggled to 'Private' (no AccessGrant record exists for those).
•	Both roles share the same authentication flow. No separate agent login URL.

20. Async States & Loading Behaviour
Several product features involve background processing that takes meaningful time. The front-end team must design and implement explicit UI states for each. 'Loading spinner and wait' is not acceptable — each state must be meaningful and branded.

20.1 Policy AI Extraction — State Machine
When a user uploads a policy, the AI extraction pipeline runs asynchronously in the background via Upstash QStash. The front-end must implement the following state machine for the policy card during processing:

State	UI Requirement
PENDING (0–2s after upload)	Policy card appears immediately in My Wallet with a 'Processing...' badge. The card shows the policy type and filename but no extracted data yet. This state is set synchronously before the AI job is enqueued.
ANALYZING — extracting_clauses (progress 0–50%)	Branded animation active on the policy card. Progress indicator driven by the Redis job status key: { state: 'extracting_clauses', progress: 45 }. Copy: 'Reading your policy...' The front-end polls the Redis job status endpoint every 2 seconds, backing off exponentially (2s → 4s → 8s → 15s max) until the state changes.
ANALYZING — scoring_gaps (progress 50–90%)	Progress updates continue. Copy changes to: 'Analysing your coverage...' The animated state remains active.
COMPLETE	Animated state resolves. Policy card populates with extracted data: insurer name, policy number, expiry date, premium. A 'New Insights Available' badge appears if gap alerts were generated. A NotificationEvent is created in the DB; the polling hook detects the status change and triggers a UI refresh.
FAILED	If the job fails after QStash retries are exhausted (dead-letter queue), the policy card shows an error state: 'We could not read this document. Try uploading again or contact support.' Provide a retry upload CTA and a 'Contact Support' link.
TIMEOUT (client-side)	If the client polls for more than 5 minutes without a COMPLETE or FAILED state, show a friendly message: 'This is taking longer than usual. We'll notify you when it's ready.' Stop polling. The job continues server-side.

20.2 Other Async Operations

Operation	Expected Behaviour
Agent document sharing	Optimistic UI: mark the document as 'Sent' immediately on CTA tap. Confirm with a server round-trip in the background. If the server action fails, revert the optimistic state and show an error toast.
Export Portfolio generation	Show a progress state: 'Generating your portfolio summary...' This is a server-side PDF generation operation. Display a loading indicator while the pre-signed URL for the generated file is being prepared. Target: under 10 seconds.
RevenueCat entitlement sync	Subscription status is read from the local Postgres replica — not from RevenueCat directly. The front-end never calls RevenueCat APIs. If a user upgrades their plan, the sync may take up to 60 seconds to propagate. Show a 'Activating your plan...' state if the user navigates to a gated feature immediately after subscribing.
Notification delivery (push)	Push notifications are delivered via the Web Push API through QStash Cron. The front-end is responsible for registering the service worker, requesting push permission, and sending the push subscription object to the server to be stored against the user's account. This registration must happen during onboarding, after the home screen install prompt.

21. Subscription Gating & Feature Limits
PolicyWallet is a subscription product. Certain features are gated behind the paid plan. The front-end must implement gating UI that is honest, non-alarming, and routes the user to upgrade — not to a dead end.

21.1 Entitlement Source of Truth
The front-end reads subscription state exclusively from the local Postgres Subscription table — never from RevenueCat or Stripe directly. The Service_Billing layer syncs entitlements server-to-server from RevenueCat's REST API. The front-end should treat the subscription fields returned by Server Actions as the authoritative gating signal.

21.2 Gated Features & Limit Behaviours

Feature	Gating Behaviour
AI Coverage Analysis (daily limit)	Free tier: limited number of AI analysis runs per day (defined in lib/subscription-limits.ts). When the limit is reached, the 'Analyse Coverage' CTA becomes disabled with a tooltip: 'Daily AI limit reached. Resets at midnight.' Paid tier: no daily limit.
Gap Analysis Engine	Full gap analysis (all 7 policy types) is a paid feature. Free users see a teaser card with 1 gap insight visible and the rest blurred with a 'Unlock full analysis' CTA linking to the subscription upgrade flow.
Family Sharing (Wallet invite)	Paid tier only. The 'Invite Family Member' CTA on free tier shows a modal explaining the feature with an upgrade prompt. Do not disable the Settings section — just gate the invite action itself.
Export Portfolio	Paid tier only. Free users see the 'Export Portfolio' CTA but tapping it opens an upgrade prompt modal rather than triggering export.
Agent Connectivity	Available on all tiers. Agent sharing and document exchange are not gated.
Policy Upload (volume)	Free tier: limited number of stored policies (defined in lib/subscription-limits.ts). When limit is reached, the '+' FAB still opens the upload flow but shows an interstitial: 'You've reached your policy limit. Upgrade to store unlimited policies.' with an upgrade CTA.

21.3 Upgrade Flow
•	The upgrade flow must be accessible from any gated feature prompt — never require the user to navigate to Settings to find the upgrade option.
•	Subscription is managed via Stripe (payment gateway) with RevenueCat as the entitlement layer. The upgrade CTA deep-links to the Stripe-hosted checkout page.
•	After payment, the user is returned to the app. Show a 'Activating your plan...' state for up to 60 seconds while RevenueCat syncs to the local DB. Then unlock the feature automatically without requiring a manual refresh.

22. Data Contracts — What the Front-End Can Rely On
The following section defines the guaranteed data contracts between the backend and the front-end UI components. These are frozen specifications — the front-end team can build visualisation components against these fields without risk of runtime schema mismatches.

22.1 The AcordData Schema (AI Extraction Output)
Every policy that has been successfully processed by the AI extraction pipeline will have its acordData field populated according to the following structure. All UI visualisation components in Sections 6, 7, and 8 of this specification must be built against these field names exclusively.

Field Path	Drives This UI Component
vehicle.estimatedMarketValue	Motor Gap Analysis — Market Value Meter gauge
vehicle.hasRoadsideAssistance	Motor policy card — Roadside Assistance badge (on/off)
vehicle.namedDrivers[]	Motor policy card and detail view — Named Drivers list
vehicle.greenCardExpiryDate	Motor policy card — Green Card validity badge and expiry warning
vehicle.deductible	Motor detail view — Deductible field
property.estimatedRebuildCost	Home Gap Analysis — Replacement Cost Slider
property.fireCoverageIncluded	Home detail view — ENFIA checklist (criterion 1 of 3)
property.earthquakeCoverageIncluded	Home detail view — ENFIA checklist (criterion 2 of 3) + Earthquake badge
property.floodCoverageIncluded	Home detail view — ENFIA checklist (criterion 3 of 3)
property.squareMeters	Home Gap Analysis — construction cost index comparison calculation
health.outOfPocketMax	Health Gap Analysis — Out-of-Pocket radial chart
health.annualLimit	Health policy card — Annual limit display
health.coordinationCentreName	Health policy card and detail view — Coordination Centre (Συντονιστικό Κέντρο) name and tap-to-call
health.directBillingAvailable	Health policy card — Direct Billing badge (on/off)
lifeAndInvestment.cashValue	Investment Life policy card — Current Fund Value + Goal Timeline chart
lifeAndInvestment.maturityDate	Investment Life policy card — Tax-free maturity status + Goal Timeline
lifeAndInvestment.beneficiaries[]	Investment Life detail view — Beneficiaries list
pet.leishmaniaCovered	Pet policy card — Leishmania (Κάλαζαρ) coverage badge (on/off). Critical Greece-specific field.
pet.breed	Pet detail view — Breed Health Radar (used to fetch breed-specific condition data)
pet.preExistingConditionsExcluded[]	Pet detail view — Breed Health Radar weaknesses overlay
pet.annualLimit	Pet policy card — Annual Limit progress bar

22.2 Policy Status Values
The Policy record's status field drives the async state machine in Section 20.1. The front-end must handle all of these values:

Status Value	UI State
PENDING	Policy card appears with 'Processing...' badge. No extracted data shown.
ANALYZING	Branded animation active. Progress driven by Redis job key. Poll every 2s with exponential backoff.
COMPLETE	Full policy card populated. AI insights available. NotificationEvent created.
FAILED	Error state on policy card. Retry upload CTA shown. Contact support link shown.
MANUALLY_ENTERED	Policy was entered manually (not via AI extraction). No AI analysis available. Fields shown as user-entered.

22.3 Notification Event Types
The NotificationEvent model drives all in-app and push notifications. The front-end must render a distinct UI card or push payload for each type:

Event Type	Trigger & Front-End Action
POLICY_ANALYZED	Fired when AI extraction completes. Resolves the async polling state. Shows 'New Insights Available' badge on policy card.
RENEWAL_REMINDER_30D	Fired by QStash Cron 30 days before policy endDate. Push notification + Dashboard timeline card update.
RENEWAL_REMINDER_7D	Fired by QStash Cron 7 days before endDate. Push notification + amber warning badge on policy card.
RENEWAL_REMINDER_3D	Fired by QStash Cron 3 days before endDate. Push notification + red warning badge.
GRACE_PERIOD_ALERT	Fired on endDate if policy not renewed. Push notification: 'You are within your grace period.'
AGENT_DOCUMENT_ADDED	Fired when an agent uploads or modifies a document. Push notification + 'Agent Updated' badge in My Wallet.
GAP_DETECTED	Fired on POLICY_ANALYZED completion if GapInstances were created. AI Insights badge on dashboard.
BENEFIT_REMINDER	Fired annually by QStash Cron if annual_checkup benefit unused. Push notification + Health & Wellness nudge card.
GREEN_CARD_EXPIRY	Fired 30 days before vehicle.greenCardExpiryDate. Push notification + warning badge on Motor policy card.
ENFIA_SEASON_ALERT	Fired by QStash Cron annually in pre-ENFIA period. Push notification + AI Insight card for eligible Home policies.

23. Storage & File Handling
All file operations bypass the Next.js server layer for performance. The front-end must implement these flows using direct Supabase Storage interactions.

23.1 Upload Flow
•	The front-end uploads policy PDFs directly to Supabase Storage using the Supabase JS client — not through a Next.js API route.
•	After the upload completes client-side, the front-end calls the uploadPolicyDocument Server Action with the resulting storage path and metadata. The Server Action creates the DB record and enqueues the AI job.
•	Accepted file types: PDF only. Maximum file size: to be confirmed with backend (recommend 50MB to accommodate multi-page Greek insurance documents).
•	Camera capture is supported via the HTML file input 'capture' attribute for photographing physical policy documents.

23.2 Retrieval Flow
•	When displaying a PDF, the front-end requests a Pre-Signed URL from Supabase Storage via a Server Action. The PDF is then streamed directly from the Supabase CDN to the browser — it does not pass through the Next.js server.
•	Pre-signed URLs have a short expiry (e.g., 60 minutes). The front-end must not cache or store these URLs beyond the session — request a fresh URL each time the user opens a document.
•	Digital Card downloads (Motor insurance card, Health membership card) are generated server-side and also delivered via pre-signed URL. The front-end triggers generation via a Server Action and then initiates a browser download from the returned URL.
•	The Export Portfolio PDF is generated server-side on demand. Same pre-signed URL delivery pattern. Show a loading state while generation occurs (target: under 10 seconds).

24. Third-Party Service Constraints
The following constraints are imposed by the chosen external services. The front-end team must design within these boundaries.

Service	Front-End Constraint
Supabase Auth	Session tokens are JWTs. Use the Supabase JS client (createClient()) for all auth operations. Do not use NextAuth — it is a legacy dependency and must not be called from any new front-end code.
Supabase Storage	Pre-signed URLs expire. Never store them in localStorage or long-lived state. Request fresh URLs per-session.
RevenueCat	The front-end never calls RevenueCat APIs directly. Read subscription state only from Server Actions that query the local Postgres Subscription table. RevenueCat sync may lag up to 60 seconds after a subscription event.
Stripe	The front-end redirects users to a Stripe-hosted checkout page for subscription upgrades. Stripe is not embedded as a component in the app. After payment, Stripe redirects back to a success URL — the front-end must handle this return and show the 'Activating your plan...' state.
Upstash Redis	The front-end polls the job status endpoint (backed by Redis) for AI extraction progress. Poll with exponential backoff. Do not poll faster than the 2-second initial interval. Stop polling after 5 minutes and show the timeout message.
QStash / Push Notifications	Push notification delivery is via the Web Push API through QStash. The front-end must register the service worker and push subscription during onboarding. On iOS, push notifications require the PWA to be installed to the home screen — the front-end must enforce the install prompt before attempting push registration on iOS devices.
LLM Providers (Gemini / OpenAI)	The front-end never calls LLM APIs directly. All AI interactions go through Server Actions → GapAnalysisService → LLM. The front-end only consumes the structured acordData output from Prisma.

25. Security & GDPR Requirements
PolicyWallet handles sensitive personal and financial data. GDPR compliance is a primary user trust signal and a legal requirement. The front-end team must implement the following requirements — these are not optional UI polish items.

25.1 Data Handling
•	Policy PDFs are stored in Supabase Storage with row-level security (RLS) policies enforced at the storage bucket level. The front-end must never construct or expose direct storage paths — always use pre-signed URLs generated by authenticated Server Actions.
•	The front-end must not store any policy data, user PII, or session tokens in localStorage or sessionStorage. Use in-memory state and Supabase session management only.
•	All agent-shared document flows must visually confirm to the user what they are sharing, with whom, and provide an explicit confirmation step before any data is transmitted.

25.2 Required GDPR UI Elements
•	A GDPR compliance badge must be visible on the signup screen and the settings page.
•	A clear data deletion flow must be accessible from Settings: 'Delete My Account & Data.' This flow must be a multi-step confirmation — not a single destructive tap.
•	Cookie/tracking consent must be handled on first app open if any analytics or third-party tracking is present. Do not use a cookie banner that obscures the UI — use a bottom sheet modal.
•	The Privacy Policy and Terms of Service must be linked from the signup screen and from Settings. These links must open in an in-app browser — not navigate away from the app.

25.3 Agent Access Transparency
•	The 'What your agent can see' summary view (Section 12.2) is a GDPR transparency requirement, not just a UX feature. It must be accurate in real time — reflecting the current state of AccessGrant records.
•	When an agent performs any action on the user's account (uploads a document, flags a change), the user must receive a notification. Silent agent actions are not permitted.


Document Note:  Version 3.0 of the PolicyWallet Product Specification. Sections 18–25 have been added to reflect the confirmed technical architecture decisions. These sections translate architectural constraints into front-end requirements, providing the development team with a complete and unambiguous build reference. The AcordData schema in Section 22.1 is frozen — all UI visualisation components must be built against these field names. The document covers user journeys, UX specifications, feature requirements, platform constraints, data contracts, async state machines, subscription gating, storage flows, third-party service boundaries, and GDPR obligations.

