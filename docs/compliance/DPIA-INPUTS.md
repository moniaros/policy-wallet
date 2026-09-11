# DPIA input pack (GDPR Art. 35)

> **Generated — do not edit by hand.** Sources: `prisma/schema.prisma` (the `@ropa`
> tags and every column), the published subprocessor list (`lib/legal/legal-content.ts` —
> the same rows `/subprocessors` renders) and the AI provider services
> (`lib/services/ai/*-ai.service.ts`). Regenerate with `npx tsx scripts/generate-ropa.ts`;
> `tests/unit/generated-compliance-docs-current.test.ts` fails when this file is stale.

**This is not a DPIA.** It is the material an Art. 35 assessment starts from — the
nature, scope and context of the processing as the code and the schema state them
today. The assessment itself is a legal judgement and is a halt
(`docs/provenance/HALTS.md` H-P2). The record of processing is [ROPA.md](ROPA.md).

## 0. Scale

| Measure | Value |
| --- | --- |
| Stores holding personal data (tagged) | 57 of 57 |
| Columns across them (relations excluded) | 714 |
| Columns declared Art. 9 | 7 (stores: 1) |
| Data-subject categories in use | admin, agent, policyholder, third_party |
| Stores under the AI-analysis purpose | 9 |
| Published processors | 10 |
| … whose published location is EEA-only | 2 (Supabase, Brevo) |
| … that receive the uploaded document itself | 5 (Supabase, Vercel, Google (Gemini API), Anthropic, OpenAI) |

## 1. Per-column purpose and lawful-basis map

Every column of every tagged store. A column inherits the purpose, basis, subjects,
retention and erasure of its store — the tag is per store, deliberately
(`docs/provenance/PROGRESS.md` D-P6) — so the heading states them once. **Class**:
**Art. 9** — named by the store's tag · *subject key* — the column that ties the row to
a person · *identifier* — `@id` or `@unique` · *ordinary* — everything else. Relation
fields are not columns and are not listed.

### `AccessGrant` — intermediary · consent · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `granterUserId` | `String` | subject key |
| `granteeUserId` | `String` | subject key |
| `scope` | `String` | ordinary |
| `permissions` | `String` | ordinary |
| `status` | `String` | ordinary |
| `grantedAt` | `DateTime` | ordinary |
| `revokedAt` | `DateTime?` | ordinary |

### `Account` — security · contract · policyholder|agent|admin · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `type` | `String` | ordinary |
| `provider` | `String` | ordinary |
| `providerAccountId` | `String` | ordinary |
| `refresh_token` | `String?` | ordinary |
| `access_token` | `String?` | ordinary |
| `expires_at` | `Int?` | ordinary |
| `token_type` | `String?` | ordinary |
| `scope` | `String?` | ordinary |
| `id_token` | `String?` | ordinary |
| `session_state` | `String?` | ordinary |

### `ActiveSession` — security · legitimate_interest · policyholder|agent|admin · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `deviceType` | `String` | ordinary |
| `deviceName` | `String` | ordinary |
| `ipAddress` | `String` | ordinary |
| `location` | `String?` | ordinary |
| `lastActiveAt` | `DateTime` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `ActivityLog` — accountability · legal_obligation · policyholder|agent|admin · technical_12m · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `adminUserId` | `String` | ordinary |
| `adminEmail` | `String` | ordinary |
| `actionType` | `String` | ordinary |
| `description` | `String` | ordinary |
| `metadata` | `Json?` | ordinary |
| `targetUserId` | `String?` | subject key |
| `timestamp` | `DateTime` | ordinary |

### `AdminUser` — security · contract · admin · account_life · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `adminLevel` | `String` | ordinary |
| `permissions` | `String[]` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `AgentProfile` — service · contract · agent · account_life · anonymize

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `verificationStatus` | `String` | ordinary |
| `agencyName` | `String?` | ordinary |
| `licenseNumber` | `String?` | ordinary |
| `logoUrl` | `String?` | ordinary |
| `brandColor` | `String?` | ordinary |
| `website` | `String?` | ordinary |
| `phone` | `String?` | ordinary |
| `documents` | `Json?` | ordinary |
| `commissionRates` | `Json?` | ordinary |
| `onboardingCompletedAt` | `DateTime?` | ordinary |
| `submittedAt` | `DateTime` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `BusinessEvent` — communication · contract · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `name` | `String` | ordinary |
| `version` | `Int` | ordinary |
| `occurredAt` | `DateTime` | ordinary |
| `recordedAt` | `DateTime` | ordinary |
| `aggregateType` | `String` | ordinary |
| `aggregateId` | `String` | ordinary |
| `sequence` | `Int` | ordinary |
| `subjectUserId` | `String?` | subject key |
| `actorType` | `String` | ordinary |
| `actorId` | `String?` | ordinary |
| `correlationId` | `String` | ordinary |
| `causationId` | `String?` | ordinary |
| `payload` | `Json` | ordinary |
| `metadata` | `Json?` | ordinary |
| `idempotencyKey` | `String?` | identifier |
| `isReplay` | `Boolean` | ordinary |
| `dispatchState` | `String` | ordinary |
| `dispatchedAt` | `DateTime?` | ordinary |

### `CollaborationAction` — intermediary · consent · policyholder|agent · account_life · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `threadId` | `String` | ordinary |
| `title` | `String` | ordinary |
| `description` | `String?` | ordinary |
| `assigneeUserId` | `String` | subject key |
| `status` | `String` | ordinary |
| `dueDate` | `DateTime?` | ordinary |
| `completedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `CollaborationMessage` — intermediary · consent · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `threadId` | `String` | ordinary |
| `senderUserId` | `String` | subject key |
| `messageType` | `String` | ordinary |
| `body` | `String` | ordinary |
| `metadata` | `Json?` | ordinary |
| `isPrivate` | `Boolean` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `CollaborationParticipant` — intermediary · consent · policyholder|agent · account_life · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `threadId` | `String` | ordinary |
| `userId` | `String` | subject key |
| `role` | `String` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `CollaborationThread` — intermediary · consent · policyholder|agent · account_life · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `relationshipId` | `String` | ordinary |
| `policyId` | `String?` | ordinary |
| `subject` | `String` | ordinary |
| `category` | `String` | ordinary |
| `status` | `String` | ordinary |
| `priority` | `String` | ordinary |
| `createdByUserId` | `String` | subject key |
| `assignedToUserId` | `String?` | subject key |
| `linkedOpportunityId` | `String?` | ordinary |
| `linkedQuestionnaireInstanceId` | `String?` | ordinary |
| `linkedGapInstanceId` | `String?` | ordinary |
| `lastActivityAt` | `DateTime` | ordinary |
| `resolvedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |
| `threadType` | `String` | ordinary |

### `ConsentAudit` — accountability · legal_obligation · policyholder|agent · accountability_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String?` | subject key |
| `consentType` | `ConsentType` | ordinary |
| `policyVersion` | `String` | ordinary |
| `locale` | `String` | ordinary |
| `source` | `String` | ordinary |
| `categories` | `Json?` | ordinary |
| `accepted` | `Boolean` | ordinary |
| `acceptedAt` | `DateTime` | ordinary |
| `ipAddress` | `String?` | ordinary |
| `userAgent` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `CreditTransaction` — billing · contract · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `amount` | `Int` | ordinary |
| `transactionType` | `String` | ordinary |
| `balanceAfter` | `Int` | ordinary |
| `description` | `String` | ordinary |
| `referralId` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `CustomerRelationship` — intermediary · consent · policyholder|agent · account_life · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `agentUserId` | `String` | subject key |
| `policyholderUserId` | `String` | subject key |
| `status` | `String` | ordinary |
| `activationStatus` | `String` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `lastInteractionAt` | `DateTime?` | ordinary |
| `unsharedCountDisclosed` | `Boolean` | ordinary |

### `DataExportRequest` — accountability · legal_obligation · policyholder|agent · accountability_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `status` | `DataExportStatus` | ordinary |
| `requestSource` | `String` | ordinary |
| `requestedAt` | `DateTime` | ordinary |
| `startedAt` | `DateTime?` | ordinary |
| `completedAt` | `DateTime?` | ordinary |
| `expiresAt` | `DateTime?` | ordinary |
| `downloadToken` | `String?` | identifier |
| `payloadJson` | `Json?` | ordinary |
| `errorMessage` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `DeletionRequest` — accountability · legal_obligation · policyholder|agent · accountability_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String?` | subject key |
| `status` | `DeletionRequestStatus` | ordinary |
| `requestedAt` | `DateTime` | ordinary |
| `reviewedAt` | `DateTime?` | ordinary |
| `completedAt` | `DateTime?` | ordinary |
| `legalBasis` | `String?` | ordinary |
| `retentionNotes` | `String?` | ordinary |
| `operatorNotes` | `String?` | ordinary |
| `errorMessage` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `DocumentRequest` — intermediary · legitimate_interest · policyholder|agent · advisor_own · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `threadId` | `String` | ordinary |
| `relationshipId` | `String` | ordinary |
| `requestedByUserId` | `String` | subject key |
| `documentType` | `String` | ordinary |
| `instruction` | `String?` | ordinary |
| `urgency` | `String` | ordinary |
| `status` | `String` | ordinary |
| `dueDate` | `DateTime?` | ordinary |
| `completedAt` | `DateTime?` | ordinary |
| `uploadedDocumentUrl` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `EntitlementUsage` — billing · contract · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `subscriptionId` | `String` | ordinary |
| `usageType` | `String` | ordinary |
| `amount` | `Int` | ordinary |
| `occurredAt` | `DateTime` | ordinary |

### `GapInstance` — analysis · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `policyId` | `String?` | ordinary |
| `userId` | `String?` | subject key |
| `gapDefinitionId` | `String` | ordinary |
| `severity` | `String` | ordinary |
| `status` | `String` | ordinary |
| `aiExplanation` | `String?` | ordinary |
| `aiSuggestion` | `String?` | ordinary |
| `detectedAt` | `DateTime` | ordinary |
| `resolvedAt` | `DateTime?` | ordinary |
| `aiExplanationEl` | `String?` | ordinary |
| `aiSuggestionEl` | `String?` | ordinary |
| `validationState` | `GapValidationState` | ordinary |
| `ruleId` | `String?` | ordinary |
| `ruleInputs` | `Json?` | ordinary |
| `engineVersion` | `String?` | ordinary |
| `analysisRunId` | `String` | ordinary |
| `lineOfBusiness` | `String` | ordinary |
| `catalogueVersion` | `String?` | ordinary |
| `supersededAt` | `DateTime?` | ordinary |
| `supersededByRunId` | `String?` | ordinary |
| `priorStatus` | `String?` | ordinary |

### `Invite` — intermediary · consent · policyholder|agent|third_party · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `inviterUserId` | `String` | subject key |
| `inviteeEmail` | `String` | ordinary |
| `inviteeUserId` | `String?` | subject key |
| `inviteType` | `String` | ordinary |
| `relationshipType` | `String?` | ordinary |
| `scope` | `String?` | ordinary |
| `requestedPermissions` | `String?` | ordinary |
| `token` | `String` | identifier |
| `expiresAt` | `DateTime` | ordinary |
| `consumedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `Invoice` — billing · legal_obligation · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `subscriptionId` | `String` | ordinary |
| `invoiceNumber` | `String` | ordinary |
| `amount` | `Decimal` | ordinary |
| `currency` | `String` | ordinary |
| `taxAmount` | `Decimal` | ordinary |
| `totalAmount` | `Decimal` | ordinary |
| `status` | `String` | ordinary |
| `billingDate` | `DateTime` | ordinary |
| `pdfUrl` | `String?` | ordinary |
| `paidAt` | `DateTime?` | ordinary |

### `LifeEventInstance` — analysis · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `definitionId` | `String` | ordinary |
| `occurredAt` | `DateTime` | ordinary |
| `discoveredAt` | `DateTime` | ordinary |
| `source` | `String` | ordinary |
| `confidence` | `String` | ordinary |
| `magnitude` | `Decimal?` | ordinary |
| `status` | `String` | ordinary |
| `appliedPatch` | `Json?` | ordinary |
| `supersedesId` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `MonthlyTokenUsage` — billing · contract · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `month` | `DateTime` | ordinary |
| `tier` | `String` | ordinary |
| `totalTokens` | `BigInt` | ordinary |
| `reservedTokens` | `BigInt` | ordinary |
| `totalCostEur` | `Decimal` | ordinary |
| `subscriptionTokens` | `BigInt` | ordinary |
| `purchasedTokensUsed` | `BigInt` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `NotificationEvent` — communication · contract · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `eventType` | `String` | ordinary |
| `channel` | `String` | ordinary |
| `status` | `String` | ordinary |
| `priority` | `String` | ordinary |
| `title` | `String` | ordinary |
| `message` | `String` | ordinary |
| `relatedObjectType` | `String?` | ordinary |
| `relatedObjectId` | `String?` | ordinary |
| `dedupeKey` | `String?` | ordinary |
| `attempts` | `Int` | ordinary |
| `nextAttemptAt` | `DateTime?` | ordinary |
| `scheduledFor` | `DateTime?` | ordinary |
| `expiresAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `sentAt` | `DateTime?` | ordinary |
| `readAt` | `DateTime?` | ordinary |
| `failureReason` | `String?` | ordinary |
| `skipReason` | `String?` | ordinary |

### `NotificationPreference` — communication · contract · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `eventType` | `String` | ordinary |
| `channel` | `String` | ordinary |
| `enabled` | `Boolean` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `Opportunity` — intermediary · legitimate_interest · policyholder|agent · advisor_own · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `relationshipId` | `String` | ordinary |
| `policyId` | `String?` | ordinary |
| `gapInstanceId` | `String?` | ordinary |
| `status` | `String` | ordinary |
| `nextActionAt` | `DateTime?` | ordinary |
| `notes` | `String?` | ordinary |
| `ownerAgentUserId` | `String` | subject key |
| `estimatedPremium` | `Decimal?` | ordinary |
| `estimatedCommission` | `Decimal?` | ordinary |
| `quotedPremium` | `Decimal?` | ordinary |
| `wonPremium` | `Decimal?` | ordinary |
| `currency` | `String` | ordinary |
| `lineOfBusiness` | `String?` | ordinary |
| `medic` | `Json?` | ordinary |
| `medicScore` | `Int?` | ordinary |
| `medicUpdatedAt` | `DateTime?` | ordinary |
| `outcome` | `String?` | ordinary |
| `outcomeNotes` | `String?` | ordinary |
| `outcomeAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `OpportunityStageHistory` — intermediary · legitimate_interest · policyholder|agent · advisor_own · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `opportunityId` | `String` | ordinary |
| `fromStatus` | `String?` | ordinary |
| `toStatus` | `String` | ordinary |
| `changedByUserId` | `String?` | subject key |
| `outcome` | `String?` | ordinary |
| `note` | `String?` | ordinary |
| `changedAt` | `DateTime` | ordinary |

### `PasskeyCredential` — security · contract · policyholder|agent|admin · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `credentialID` | `String` | identifier |
| `credentialPublicKey` | `Bytes` | ordinary |
| `counter` | `BigInt` | ordinary |
| `transports` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `lastUsedAt` | `DateTime` | ordinary |

### `PaymentMethod` — billing · contract · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `type` | `String` | ordinary |
| `lastFour` | `String` | ordinary |
| `brand` | `String?` | ordinary |
| `expiryMonth` | `Int?` | ordinary |
| `expiryYear` | `Int?` | ordinary |
| `isDefault` | `Boolean` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `Policy` — service · contract · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `ownerUserId` | `String` | subject key |
| `createdByUserId` | `String` | subject key |
| `policyNumber` | `String` | ordinary |
| `insurerName` | `String` | ordinary |
| `lineOfBusiness` | `String` | ordinary |
| `startDate` | `DateTime` | ordinary |
| `endDate` | `DateTime` | ordinary |
| `coverageEndDate` | `DateTime?` | ordinary |
| `status` | `String` | ordinary |
| `premiumAmount` | `Decimal?` | ordinary |
| `premiumCurrency` | `String?` | ordinary |
| `coverageSummary` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |
| `acordData` | `Json?` | ordinary |
| `lastAnalyzedAt` | `DateTime?` | ordinary |
| `reportUnlockedAt` | `DateTime?` | ordinary |

### `PolicyAnalysisRun` — analysis · consent · policyholder · account_life · cascade

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `policyId` | `String` | ordinary |
| `userId` | `String` | subject key |
| `provider` | `String` | ordinary |
| `model` | `String` | ordinary |
| `status` | `AnalysisRunStatus` | ordinary |
| `priority` | `Int` | ordinary |
| `runAttempt` | `Int` | ordinary |
| `overallSuccessPct` | `Int?` | ordinary |
| `estimatedTokens` | `Int?` | ordinary |
| `actualInputTokens` | `Int?` | ordinary |
| `actualOutputTokens` | `Int?` | ordinary |
| `actualTotalTokens` | `Int?` | ordinary |
| `blockedReason` | `String?` | ordinary |
| `failureCode` | `String?` | ordinary |
| `failureMessage` | `String?` | ordinary |
| `remediationSummary` | `Json?` | ordinary |
| `resultJson` | `Json?` | ordinary |
| `attemptedRules` | `Json?` | ordinary |
| `executionLeaseId` | `String?` | ordinary |
| `executionLeaseExpiresAt` | `DateTime?` | ordinary |
| `leaseHeartbeatAt` | `DateTime?` | ordinary |
| `startedAt` | `DateTime?` | ordinary |
| `finishedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `PolicyDocument` — service · contract · policyholder · account_life · cascade

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `policyId` | `String` | ordinary |
| `fileUrl` | `String` | ordinary |
| `fileName` | `String` | ordinary |
| `fileSize` | `Int` | ordinary |
| `source` | `String` | ordinary |
| `processingStatus` | `String` | ordinary |
| `uploadedByUserId` | `String` | subject key |
| `uploadedAt` | `DateTime` | ordinary |
| `documentHash` | `String?` | ordinary |
| `extractionCache` | `Json?` | ordinary |
| `extractedAt` | `DateTime?` | ordinary |
| `storageBucket` | `String?` | ordinary |
| `storageKey` | `String?` | ordinary |
| `storageProvider` | `String?` | ordinary |
| `mimeType` | `String?` | ordinary |
| `documentKind` | `String?` | ordinary |
| `validationStatus` | `String?` | ordinary |
| `validationJson` | `Json?` | ordinary |
| `validatedAt` | `DateTime?` | ordinary |
| `effectiveFrom` | `DateTime?` | ordinary |
| `effectiveTo` | `DateTime?` | ordinary |
| `version` | `Int` | ordinary |
| `supersededById` | `String?` | identifier |

### `PolicyholderProfile` — analysis · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `preferences` | `Json?` | ordinary |
| `maritalStatus` | `String?` | ordinary |
| `dependentsCount` | `Int` | ordinary |
| `employmentStatus` | `String?` | ordinary |
| `ownsHome` | `Boolean` | ordinary |
| `mortgageAmount` | `Decimal?` | ordinary |
| `hasPets` | `Boolean` | ordinary |
| `petsCount` | `Int?` | ordinary |
| `vehiclesCount` | `Int` | ordinary |
| `dateOfBirth` | `DateTime?` | ordinary |
| `annualIncome` | `Decimal?` | ordinary |
| `occupation` | `String?` | ordinary |
| `riskTolerance` | `String?` | ordinary |
| `hasLoans` | `Boolean` | ordinary |
| `loanAmount` | `Decimal?` | ordinary |
| `travelsFrequently` | `Boolean` | ordinary |
| `smokingStatus` | `String?` | **Art. 9** |
| `lifeEvents` | `Json?` | ordinary |
| `childrenCount` | `Int` | ordinary |
| `residenceType` | `String?` | ordinary |
| `propertiesOwned` | `Int?` | ordinary |
| `rentsOutProperty` | `Boolean` | ordinary |
| `ownsBoat` | `Boolean` | ordinary |
| `ownsBusiness` | `Boolean` | ordinary |
| `businessEmployees` | `Int` | ordinary |
| `savingsAmount` | `Decimal?` | ordinary |
| `valuablesValue` | `Decimal?` | ordinary |
| `activities` | `Json?` | ordinary |
| `cyberExposure` | `String?` | ordinary |
| `retirementPlanning` | `Boolean` | ordinary |
| `isBuildingManager` | `Boolean` | ordinary |
| `coverHeldElsewhere` | `Json?` | ordinary |
| `answeredFields` | `Json?` | ordinary |
| `incomeDependency` | `String?` | ordinary |
| `factProvenance` | `Json?` | ordinary |
| `gender` | `String?` | **Art. 9** |
| `heightCm` | `Int?` | **Art. 9** |
| `weightKg` | `Int?` | **Art. 9** |
| `chronicConditions` | `Json?` | **Art. 9** |
| `familyMedicalHistory` | `Json?` | **Art. 9** |
| `drivingRecord` | `String?` | ordinary |
| `activityLevel` | `String?` | **Art. 9** |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `PolicyMergeRequest` — service · contract · policyholder · account_life · cascade

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `existingPolicyId` | `String` | ordinary |
| `incomingPolicyId` | `String` | ordinary |
| `requestedByUserId` | `String` | subject key |
| `approverUserId` | `String` | subject key |
| `status` | `String` | ordinary |
| `decidedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `PolicyRenewal` — service · contract · policyholder · account_life · cascade

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `policyId` | `String` | ordinary |
| `ownerUserId` | `String` | subject key |
| `agentUserId` | `String?` | ordinary |
| `policyEndDate` | `DateTime` | ordinary |
| `daysBeforeExpiry` | `Int` | ordinary |
| `status` | `String` | ordinary |
| `outcome` | `String?` | ordinary |
| `outcomeNotes` | `String?` | ordinary |
| `outcomeAt` | `DateTime?` | ordinary |
| `remindersSent` | `Json` | ordinary |
| `lastReminderAt` | `DateTime?` | ordinary |
| `taskId` | `String?` | ordinary |
| `opportunityId` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `Proposal` — intermediary · legitimate_interest · policyholder|agent · advisor_own · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `threadId` | `String` | ordinary |
| `relationshipId` | `String` | ordinary |
| `createdByUserId` | `String` | subject key |
| `proposalType` | `String` | ordinary |
| `insurerName` | `String` | ordinary |
| `lineOfBusiness` | `String` | ordinary |
| `premiumAmount` | `Decimal` | ordinary |
| `premiumCurrency` | `String` | ordinary |
| `coverageSummary` | `String` | ordinary |
| `comparisonData` | `Json?` | ordinary |
| `plainLanguageSummary` | `String?` | ordinary |
| `status` | `String` | ordinary |
| `clientResponseAt` | `DateTime?` | ordinary |
| `eSignatureUrl` | `String?` | ordinary |
| `declineReason` | `String?` | ordinary |
| `declineComment` | `String?` | ordinary |
| `counterOfferNotes` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `ProtectionProfile` — analysis · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `intent` | `String?` | ordinary |
| `riskConcerns` | `Json?` | ordinary |
| `commitments` | `Json?` | ordinary |
| `confidenceLevel` | `String?` | ordinary |
| `uncertaintyReasons` | `Json?` | ordinary |
| `recentChanges` | `Json?` | ordinary |
| `futureConsiderations` | `Json?` | ordinary |
| `guidancePreference` | `String?` | ordinary |
| `priorityAreas` | `Json?` | ordinary |
| `answers` | `Json?` | ordinary |
| `answeredSteps` | `Json?` | ordinary |
| `unsureSteps` | `Json?` | ordinary |
| `uploadChoice` | `String?` | ordinary |
| `version` | `Int` | ordinary |
| `startedAt` | `DateTime` | ordinary |
| `completedAt` | `DateTime?` | ordinary |
| `skippedAt` | `DateTime?` | ordinary |
| `summaryViewedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `ProtectionScore` — analysis · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `overallScore` | `Int` | ordinary |
| `categoryScores` | `Json` | ordinary |
| `gapCount` | `Int` | ordinary |
| `expectedLines` | `Json` | ordinary |
| `assessmentCoverage` | `Int?` | ordinary |
| `actualLines` | `Json` | ordinary |
| `computedAt` | `DateTime` | ordinary |

### `PushDevice` — communication · consent · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `endpoint` | `String` | identifier |
| `p256dh` | `String` | ordinary |
| `auth` | `String` | ordinary |
| `userAgent` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `lastSeenAt` | `DateTime` | ordinary |
| `lastSuccessAt` | `DateTime?` | ordinary |
| `failureCount` | `Int` | ordinary |

### `QuestionnaireInstance` — intermediary · consent · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `templateId` | `String` | ordinary |
| `relationshipId` | `String` | ordinary |
| `sentToUserId` | `String` | subject key |
| `sentByUserId` | `String` | subject key |
| `status` | `String` | ordinary |
| `sentAt` | `DateTime` | ordinary |
| `completedAt` | `DateTime?` | ordinary |

### `QuestionnaireResponse` — intermediary · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `instanceId` | `String` | ordinary |
| `userId` | `String` | subject key |
| `answers` | `Json` | ordinary |
| `submittedAt` | `DateTime` | ordinary |

### `RecommendationInstance` — analysis · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `gapInstanceId` | `String?` | ordinary |
| `lineOfBusiness` | `String` | ordinary |
| `ruleId` | `String?` | ordinary |
| `title` | `Json` | ordinary |
| `description` | `Json` | ordinary |
| `urgency` | `String` | ordinary |
| `estimatedCostEur` | `Decimal?` | ordinary |
| `personalReason` | `Json` | ordinary |
| `status` | `String` | ordinary |
| `riskStatus` | `String?` | ordinary |
| `confidence` | `String?` | ordinary |
| `riskId` | `String?` | ordinary |
| `expectedImpact` | `Json?` | ordinary |
| `mitigations` | `Json?` | ordinary |
| `suggestedSolution` | `Json?` | ordinary |
| `eligibilityNote` | `Json?` | ordinary |
| `dismissReason` | `String?` | ordinary |
| `actionedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |
| `productId` | `String?` | ordinary |

### `Referral` — billing · consent · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `referrerUserId` | `String` | subject key |
| `referredUserId` | `String?` | subject key |
| `referredEmail` | `String` | ordinary |
| `referredSubscriptionId` | `String?` | ordinary |
| `status` | `String` | ordinary |
| `creditsEarned` | `Int` | ordinary |
| `creditedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `ReportUnlockPurchase` — billing · contract · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `policyId` | `String` | ordinary |
| `amountEur` | `Decimal` | ordinary |
| `stripeSessionId` | `String?` | identifier |
| `status` | `String` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `RiskProfileVersion` — analysis · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `version` | `Int` | ordinary |
| `computedAt` | `DateTime` | ordinary |
| `trigger` | `String` | ordinary |
| `lifeEventId` | `String?` | ordinary |
| `overallScore` | `Int` | ordinary |
| `assessmentCoverage` | `Int?` | ordinary |
| `indeterminate` | `Boolean` | ordinary |
| `risks` | `Json` | ordinary |
| `categoryScores` | `Json` | ordinary |
| `openFindingCount` | `Int` | ordinary |
| `contextHash` | `String` | ordinary |

### `RiskReview` — analysis · consent · policyholder · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `trigger` | `String` | ordinary |
| `status` | `String` | ordinary |
| `dueAt` | `DateTime` | ordinary |
| `openedAt` | `DateTime` | ordinary |
| `completedAt` | `DateTime?` | ordinary |
| `scoreAtOpen` | `Int?` | ordinary |
| `scoreAtClose` | `Int?` | ordinary |
| `findingsAtOpen` | `Int?` | ordinary |
| `versionAtOpen` | `Int?` | ordinary |
| `outcome` | `String?` | ordinary |
| `causedByEventId` | `String?` | ordinary |

### `SecurityEvent` — security · legitimate_interest · policyholder|agent|admin · technical_12m · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `eventType` | `String` | ordinary |
| `ipAddress` | `String?` | ordinary |
| `userAgent` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `Session` — security · contract · policyholder|agent|admin · session · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `sessionToken` | `String` | identifier |
| `userId` | `String` | subject key |
| `expires` | `DateTime` | ordinary |

### `Subscription` — billing · contract · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `planId` | `String` | ordinary |
| `status` | `String` | ordinary |
| `currentPeriodStart` | `DateTime` | ordinary |
| `currentPeriodEnd` | `DateTime` | ordinary |
| `autoRenew` | `Boolean` | ordinary |
| `provider` | `String` | ordinary |
| `revenueCatIdentifier` | `String?` | identifier |
| `stripeSubscriptionId` | `String?` | identifier |
| `stripePriceId` | `String?` | ordinary |
| `stripeStatus` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `TenantMembership` — service · contract · agent|admin · account_life · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `tenantId` | `String` | ordinary |
| `userId` | `String` | subject key |
| `role` | `String` | ordinary |
| `status` | `String` | ordinary |
| `invitedBy` | `String?` | ordinary |
| `invitedAt` | `DateTime?` | ordinary |
| `joinedAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `TokenBalance` — billing · contract · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `purchasedTokens` | `BigInt` | ordinary |
| `usedTokens` | `BigInt` | ordinary |
| `lastPurchaseAt` | `DateTime?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `TokenPurchase` — billing · contract · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `tokensPurchased` | `BigInt` | ordinary |
| `amountEur` | `Decimal` | ordinary |
| `stripePaymentIntentId` | `String?` | ordinary |
| `stripeSessionId` | `String?` | identifier |
| `status` | `String` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `TokenUsage` — billing · contract · policyholder|agent · tax_5y · retained

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `operationType` | `String` | ordinary |
| `policyId` | `String?` | ordinary |
| `inputTokens` | `Int` | ordinary |
| `outputTokens` | `Int` | ordinary |
| `totalTokens` | `Int` | ordinary |
| `costEur` | `Decimal` | ordinary |
| `model` | `String` | ordinary |
| `createdAt` | `DateTime` | ordinary |

### `User` — service · contract · policyholder|agent|admin · account_life · anonymize

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `name` | `String?` | ordinary |
| `email` | `String` | identifier |
| `emailVerified` | `DateTime?` | ordinary |
| `image` | `String?` | ordinary |
| `preferredLanguage` | `String` | ordinary |
| `roles` | `String` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |
| `lastActiveAt` | `DateTime?` | ordinary |
| `password` | `String?` | ordinary |
| `phoneNumber` | `String?` | ordinary |
| `taxId` | `String?` | ordinary |
| `contactEmailMissing` | `Boolean` | ordinary |
| `pushToken` | `String?` | ordinary |
| `stripeCustomerId` | `String?` | identifier |
| `termsVersionAccepted` | `String?` | ordinary |
| `privacyVersionAccepted` | `String?` | ordinary |
| `cookieConsentVersion` | `String?` | ordinary |
| `consentUpdatedAt` | `DateTime?` | ordinary |
| `consentLocale` | `String?` | ordinary |
| `aiProcessingConsentVersion` | `String?` | ordinary |
| `trialAnalysisUsedAt` | `DateTime?` | ordinary |

### `UserNotificationSettings` — communication · contract · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `userId` | `String` | subject key |
| `timezone` | `String` | ordinary |
| `quietHoursEnabled` | `Boolean` | ordinary |
| `quietHoursStart` | `Int` | ordinary |
| `quietHoursEnd` | `Int` | ordinary |
| `maxPerDay` | `Int?` | ordinary |
| `digestMode` | `String` | ordinary |
| `updatedAt` | `DateTime` | ordinary |

### `UserTask` — service · contract · policyholder|agent · account_life · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `creatorUserId` | `String?` | subject key |
| `type` | `String` | ordinary |
| `title` | `String` | ordinary |
| `description` | `String?` | ordinary |
| `status` | `String` | ordinary |
| `priority` | `String` | ordinary |
| `dueDate` | `DateTime?` | ordinary |
| `actionUrl` | `String?` | ordinary |
| `actionLabel` | `String?` | ordinary |
| `createdAt` | `DateTime` | ordinary |
| `updatedAt` | `DateTime` | ordinary |
| `completedAt` | `DateTime?` | ordinary |

### `WebAuthnChallenge` — security · contract · policyholder|agent|admin · session · delete

| Column | Type | Class |
| --- | --- | --- |
| `id` | `String` | identifier |
| `userId` | `String` | subject key |
| `challenge` | `String` | identifier |
| `expiresAt` | `DateTime` | ordinary |
| `createdAt` | `DateTime` | ordinary |

## 2. Special categories of personal data (Art. 9) — the two routes

**(a) Structured columns a person answers directly.** Processed on explicit consent only — Art. 9(2)(a); the tag guard refuses another basis.

| Store | Columns | Lawful basis |
| --- | --- | --- |
| `PolicyholderProfile` | `chronicConditions`, `familyMedicalHistory`, `smokingStatus`, `heightCm`, `weightKg`, `gender`, `activityLevel` | Consent — Art. 6(1)(a) |

Held by the processors that store or carry every table: Supabase, Vercel.

**(b) Whatever an uploaded policy document contains.** The document is stored as a
`PolicyDocument` row plus a private storage object and is **not parsed into columns**,
so its Art. 9 content — medical annexes, exclusions naming conditions, ΑΜΚΑ — is
unbounded by design (DATA_PROTECTION_REVIEW_PACK.md §3.2b). The whole file leaves our
boundary at the extraction step (§7). Processors that receive it:

| Processor | Published location | How it receives the document | Endpoint, as constructed in code |
| --- | --- | --- | --- |
| Supabase | EU — eu-west-3 (Paris, France) | primary store of every table and of the document bucket | n/a — configured outside the application code |
| Vercel | EU/US (global network) | every request and response passes through it in transit; technical logs | n/a — configured outside the application code |
| Google (Gemini API) | EU/US | the WHOLE uploaded file, base64, at the extraction step; structured fields at the later model steps (DATA_PROTECTION_REVIEW_PACK.md §7) | options `apiKey` — SDK default endpoint (global), no region, no retention option in code (`gemini-ai.service.ts`) |
| Anthropic | US | alternate provider: the same payload as the primary whenever the router selects it; a document reaches a second provider only under the failover gate (§7) | options `apiKey` — SDK default endpoint (global), no region, no retention option in code (`anthropic-ai.service.ts`) |
| OpenAI | US | alternate provider: the same payload as the primary whenever the router selects it; a document reaches a second provider only under the failover gate (§7) | options `apiKey` — SDK default endpoint (global), no region, no retention option in code (`openai-ai.service.ts`) |

## 3. Transfer table

One row per processor on `/subprocessors`, in the order published there. *Role* and
*Location* are the published text; *Purposes*, *How* and *Receives the document* are the
authored map in `lib/compliance/ropa-report.ts` (`PROCESSOR_FEEDS`); *Stores under those
purposes* is derived from the tags — it names the stores the purpose covers, not a claim
that every row of them reaches the processor; *Endpoint* is read from the provider
service's constructor. A processor
missing from the map, or a provider service missing from the published list, stops the
generator rather than rendering a pack without it.

| Processor | Role (published) | Location (published) | Purposes | Stores under those purposes | How | Receives the document | Endpoint, as constructed in code |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase | Database, authentication, file storage | EU — eu-west-3 (Paris, France) | all | all 57 | primary store of every table and of the document bucket | **yes** | n/a — configured outside the application code |
| Vercel | Application hosting and content delivery network (CDN) | EU/US (global network) | all | all 57 | every request and response passes through it in transit; technical logs | **yes** | n/a — configured outside the application code |
| Stripe | Payment and subscription processing | EU/US | billing | `CreditTransaction`, `EntitlementUsage`, `Invoice`, `MonthlyTokenUsage`, `PaymentMethod`, `Referral`, `ReportUnlockPurchase`, `Subscription`, `TokenBalance`, `TokenPurchase`, `TokenUsage` | checkout, subscription and invoice objects; card data never reaches our systems | no | n/a — configured outside the application code |
| Brevo | Email delivery (notifications, newsletter) | EU (France) | communication | `BusinessEvent`, `NotificationEvent`, `NotificationPreference`, `PushDevice`, `UserNotificationSettings` | the address, name and body of each email sent | no | n/a — configured outside the application code |
| Upstash | Request rate limiting (Redis) | EU/US | none | none | per-IP request counters for rate limiting — no store feeds it | no | n/a — configured outside the application code |
| Sentry | Application error monitoring | EU/US | none | none | error events with personal data scrubbed — no store feeds it | no | n/a — configured outside the application code |
| Google (Gemini API) | AI document analysis — primary provider | EU/US | analysis | `GapInstance`, `LifeEventInstance`, `PolicyAnalysisRun`, `PolicyholderProfile`, `ProtectionProfile`, `ProtectionScore`, `RecommendationInstance`, `RiskProfileVersion`, `RiskReview` | the WHOLE uploaded file, base64, at the extraction step; structured fields at the later model steps (DATA_PROTECTION_REVIEW_PACK.md §7) | **yes** | options `apiKey` — SDK default endpoint (global), no region, no retention option in code (`gemini-ai.service.ts`) |
| Google (Google Analytics) | Usage analytics | EU/US | none | none | aggregate usage events with the IP anonymised, only after opt-in — no store feeds it | no | n/a — configured outside the application code |
| Anthropic | AI document analysis — alternate provider | US | analysis | `GapInstance`, `LifeEventInstance`, `PolicyAnalysisRun`, `PolicyholderProfile`, `ProtectionProfile`, `ProtectionScore`, `RecommendationInstance`, `RiskProfileVersion`, `RiskReview` | alternate provider: the same payload as the primary whenever the router selects it; a document reaches a second provider only under the failover gate (§7) | **yes** | options `apiKey` — SDK default endpoint (global), no region, no retention option in code (`anthropic-ai.service.ts`) |
| OpenAI | AI document analysis — alternate provider | US | analysis | `GapInstance`, `LifeEventInstance`, `PolicyAnalysisRun`, `PolicyholderProfile`, `ProtectionProfile`, `ProtectionScore`, `RecommendationInstance`, `RiskProfileVersion`, `RiskReview` | alternate provider: the same payload as the primary whenever the router selects it; a document reaches a second provider only under the failover gate (§7) | **yes** | options `apiKey` — SDK default endpoint (global), no region, no retention option in code (`openai-ai.service.ts`) |

## 4. Open questions the assessment inherits

Derived from the sources above; each is a fact the pack can state, not a judgement.

- **Stores tagged `unclear`:** none.
- **AI clients constructed without an endpoint or region:** Anthropic (`anthropic-ai.service.ts`), Google (Gemini API) (`gemini-ai.service.ts`), OpenAI (`openai-ai.service.ts`). The SDK default endpoint applies, with the provider account's default retention terms (DATA_PROTECTION_REVIEW_PACK.md §8, §14.1 — halt H-P1).
- **Processors whose published location is not EEA-only:** Vercel (EU/US (global network)), Stripe (EU/US), Upstash (EU/US), Sentry (EU/US), Google (Gemini API) (EU/US), Google (Google Analytics) (EU/US), Anthropic (US), OpenAI (US).
- **Art. 9 data that reaches a non-EEA-only processor:** Vercel, Google (Gemini API), Anthropic, OpenAI — through route (b), the document.
- **The decisions this pack cannot take** are halts H-P1 … H-P5 in `docs/provenance/HALTS.md`.

## 5. What this pack is not

It does not assess necessity, proportionality or residual risk, and it does not say
whether a DPIA is required — those are Art. 35 judgements for counsel (H-P2, and
question 4 in DATA_PROTECTION_REVIEW_PACK.md §15). It states what is processed, on which
recorded basis, where it goes and how the code sends it, as of the commit that generated
it — and it goes red in CI the moment any of those sources moves.
