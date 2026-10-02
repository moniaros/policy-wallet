import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
vi.mock('@/lib/auth-helpers',()=>({getAuthenticatedUser:vi.fn(async()=>({dbUser:{id:'owner',roles:'policyholder'}}))}))
vi.mock('@/lib/policy-access',()=>({getPolicyAccess:vi.fn(async()=>({exists:true,isOwner:true}))}))
vi.mock('@/lib/db',()=>({db:{policy:{findFirst:vi.fn()},preventionBenefitUse: { deleteMany: vi.fn(), upsert: vi.fn() }, preventionProgress:{upsert:vi.fn(),deleteMany:vi.fn()},preventionCheckIn:{create:vi.fn(),deleteMany:vi.fn()},healthBenefitUsage:{findFirst:vi.fn(),upsert:vi.fn(),updateMany:vi.fn(),deleteMany:vi.fn()},healthRiskAssessment:{deleteMany:vi.fn()},healthShare:{updateMany:vi.fn()},$transaction:vi.fn(async a=> typeof a === "function" ? a(db) : Promise.all(a))}}))
import { db } from '@/lib/db'
import { getPolicyAccess } from '@/lib/policy-access'
import { resolvePreventionPolicy } from '@/lib/prevention/benefits'
import { actionsForPolicy } from '@/lib/prevention/catalogue'
import { savePreventionProgress, savePreventionCheckIn, deletePreventionData } from '@/app/(protected)/wellness/prevention-actions'
import { submitHealthAssessment } from '@/app/(protected)/wellness/actions'
import { shareHealthWithAdvisor } from '@/app/(protected)/wellness/share-actions'
const row={id:'p',status:'active',lineOfBusiness:'motor',insurerName:'Test',policyNumber:'P',endDate:'2099-01-01',acordData:{}}
const item=actionsForPolicy(resolvePreventionPolicy(row))[0]
const input={policyId:'p',itemKey:item.id,sourceVersion:item.sourceVersion,choice:'planned'}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('PREVENTION_HUB_ENABLED','1');vi.mocked(db.policy.findFirst).mockResolvedValue(row as any);vi.mocked(getPolicyAccess).mockResolvedValue({exists:true,isOwner:true} as any)})
it('blocks flag-off writes',async()=>{vi.stubEnv('PREVENTION_HUB_ENABLED','0');expect(await savePreventionProgress(input)).toEqual({error:'DISABLED'});expect(db.preventionProgress.upsert).not.toHaveBeenCalled()})
it('blocks cross-owner and advisor writes even with read access',async()=>{vi.mocked(getPolicyAccess).mockResolvedValue({exists:true,isOwner:false,canRead:true} as any);expect(await savePreventionProgress(input)).toEqual({error:'NOT_FOUND'});expect(db.preventionProgress.upsert).not.toHaveBeenCalled()})
it('ignores no acting-user override; rejects forged item/source',async()=>{expect(await savePreventionProgress({...input,userId:'other'})).toEqual({error:'INVALID'});expect(await savePreventionProgress({...input,itemKey:'invented'})).toEqual({error:'NOT_AVAILABLE'});expect(await savePreventionProgress({...input,sourceVersion:'old'})).toEqual({error:'SOURCE_CHANGED'})})
it('only records session owner progress and no implicit reminder',async()=>{expect(await savePreventionProgress(input)).toEqual({ok:true});expect(db.preventionProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({create:expect.objectContaining({userId:'owner',remindAt:null,status:'planned'})}))})
it('health in a motor policy still requires separate consent',async()=>{const r={...row,acordData:{health:{annualCheckupIncluded:true}}};vi.mocked(db.policy.findFirst).mockResolvedValue(r as any);const i=resolvePreventionPolicy(r).items[0];expect(await savePreventionProgress({...input,itemKey:i.id,sourceVersion:i.sourceVersion})).toEqual({error:'CONSENT_REQUIRED'});expect(db.healthBenefitUsage.upsert).not.toHaveBeenCalled()})
it('retired health scores cannot be generated or shared',async()=>{expect(await submitHealthAssessment({consent:true,answers:{}})).toEqual({error:'RETIRED'});expect(await shareHealthWithAdvisor({relationshipId:'r',scope:'assessment',consent:true})).toEqual({error:'RETIRED'})})
it('check-in refuses missing consent and never writes to profile or shares',async()=>{expect(await savePreventionCheckIn({consent:false,answers:{activityDays:2}})).toEqual({error:'INVALID'});expect(db.preventionCheckIn.create).not.toHaveBeenCalled();await savePreventionCheckIn({consent:true,answers:{activityDays:2}});expect(db.preventionCheckIn.create).toHaveBeenCalledWith({data:expect.objectContaining({userId:'owner',answers:{activityDays:2}})})})

it('withdrawal removes prevention data and archived share snapshots for the session owner',async()=>{await deletePreventionData();expect(db.preventionCheckIn.deleteMany).toHaveBeenCalledWith({where:{userId:'owner'}});expect(db.healthShare.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{userId:'owner'},data:expect.objectContaining({status:'revoked'})}));expect(db.healthRiskAssessment.deleteMany).toHaveBeenCalledWith({where:{userId:'owner'}})})

import { savePreventionBenefitUse } from '@/app/(protected)/wellness/prevention-actions'
const usageRow = { ...row, acordData: { extraction: { benefitComposition: { version: '1', sourceVersion: 'version-a', generatedAt: '2026-10-02', activation: 'unconfirmed', issues: [], documents: [], conditions: [], period: { key: '2026-05-22/2027-05-22', start: '2026-05-22', end: '2027-05-22' }, benefits: [{ key: 'checkup', state: 'clarify', sources: {}, perk: { name: { el: 'Check-up', en: 'Check-up' }, rules: { code: 'annual_checkup', frequencyBasis: 'insurance_year' } } }] } } } }
function usageInput() {
 vi.stubEnv('PREVENTION_PERSONALIZATION_ENABLED','1');vi.mocked(db.policy.findFirst).mockResolvedValue(usageRow as any)
 const i=resolvePreventionPolicy(usageRow).items[0]
 return {policyId:'p',itemKey:i.id,sourceVersion:i.sourceVersion,periodKey:i.period!.key,status:'used',healthConsent:true,usedOn:'2026-06-01'}
}
it('stores service use independently and idempotently per owner/item/period',async()=>{
 const input=usageInput();expect(await savePreventionBenefitUse(input)).toEqual({ok:true});expect(await savePreventionBenefitUse(input)).toEqual({ok:true})
 expect(db.preventionBenefitUse.upsert).toHaveBeenCalledWith(expect.objectContaining({where:{userId_itemKey_periodKey:{userId:'owner',itemKey:input.itemKey,periodKey:input.periodKey}},create:expect.objectContaining({status:'used'})}));expect(db.preventionProgress.upsert).not.toHaveBeenCalled()
})
it.each(['owner','consent','source','period','date','userOverride'])('refuses invalid service use: %s',async kind=>{
 const input=usageInput();let expected='INVALID'
 if(kind==='owner'){vi.mocked(getPolicyAccess).mockResolvedValue({exists:true,isOwner:false} as any);expected='NOT_FOUND'}
 if(kind==='consent'){input.healthConsent=false;expected='CONSENT_REQUIRED'}
 if(kind==='source'){input.sourceVersion='old';expected='SOURCE_CHANGED'}
 if(kind==='period'){input.periodKey='2025-05-22/2026-05-22';expected='SOURCE_CHANGED'}
 if(kind==='date'){input.usedOn='2026-05-21';expected='INVALID_DATE'}
 expect(await savePreventionBenefitUse(kind==='userOverride'?{...input,userId:'other'}:input)).toEqual({error:expected});expect(db.preventionBenefitUse.upsert).not.toHaveBeenCalled()
})
it('new check-up plans cancel the old sender without erasing delivery history',async()=>{
 const input=usageInput();
 await savePreventionProgress({policyId:input.policyId,itemKey:input.itemKey,sourceVersion:input.sourceVersion,choice:'planned',healthConsent:true})
 expect(db.healthBenefitUsage.updateMany).toHaveBeenCalledWith({where:{userId:'owner',policyKey:'p',benefit:'annual_checkup'},data:{remindAt:null}})
})
it('the legacy action cannot start a second sender for an insurance-period check-up', async()=>{
 usageInput()
 const {setCheckupIntent}=await import('@/app/(protected)/wellness/actions')
 const {reminderWindow}=await import('@/lib/wellness/checkup-benefit')
 expect(await setCheckupIntent({policyId:'p',choice:'considering',remindAt:reminderWindow().min})).toEqual({error:'SOURCE_CHANGED'})
 expect(db.healthBenefitUsage.upsert).not.toHaveBeenCalled()
})
