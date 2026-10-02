import { beforeEach, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({ claim:vi.fn(async()=>({count:1})), emit:vi.fn(async(_input?: any)=>({written:1,deduped:false})), findMany:vi.fn(),findFirst:vi.fn(),updateMany:vi.fn() }))
vi.mock('@/lib/notifications/dispatch',()=>({emit:mocks.emit}))
vi.mock('@/lib/db',()=>({db:{preventionProgress:{findMany:mocks.findMany,updateMany:mocks.updateMany},policy:{findFirst:mocks.findFirst},$transaction:vi.fn(async cb=>cb({preventionProgress:{updateMany:mocks.claim}}))}}))
import { runPreventionReminders } from '@/lib/prevention/reminders'
import { resolvePreventionPolicy } from '@/lib/prevention/benefits'
import { actionsForPolicy } from '@/lib/prevention/catalogue'
const now=new Date('2026-10-02T10:00:00Z')
const policy={id:'p',lineOfBusiness:'motor',insurerName:'Test',policyNumber:'P',status:'active',endDate:'2027-10-01',acordData:{}}
const item=actionsForPolicy(resolvePreventionPolicy(policy,now))[0]
const row={id:'r',userId:'u',policyId:'p',itemKey:item.id,sourceVersion:item.sourceVersion,remindAt:new Date('2026-10-02'),updatedAt:new Date('2026-10-01'),consentVersion:null}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('PREVENTION_HUB_ENABLED','1');mocks.findMany.mockResolvedValue([row]);mocks.findFirst.mockResolvedValue(policy);mocks.claim.mockResolvedValue({count:1});mocks.emit.mockResolvedValue({written:1,deduped:false})})
it('sends only an explicitly due record, with generic private copy and stable dedupe',async()=>{
 expect(await runPreventionReminders(now)).toMatchObject({reminded:1});expect(mocks.findMany.mock.calls[0][0].where).toMatchObject({remindedAt:null,status:{in:['planned','later']}})
 const message=mocks.emit.mock.calls[0][0] as any;expect(message).toMatchObject({userId:'u',event:'prevention_reminder',relatedObjectType:'prevention',dedupeKey:'prevention:r:2026-10-02'})
 expect(JSON.stringify(message)).not.toContain('Test');expect(message.relatedObjectType).not.toBe('policy')
})
it('a concurrently changed or claimed row cannot emit twice',async()=>{mocks.claim.mockResolvedValue({count:0});await runPreventionReminders(now);expect(mocks.emit).not.toHaveBeenCalled()})
it.each(['expired','cancelled','removed','changed'])('cancels %s sources',async state=>{
 if(state==='removed')mocks.findFirst.mockResolvedValue(null)
 if(state==='expired')mocks.findFirst.mockResolvedValue({...policy,endDate:'2025-01-01'})
 if(state==='cancelled')mocks.findFirst.mockResolvedValue({...policy,status:'cancelled'})
 if(state==='changed')mocks.findMany.mockResolvedValue([{...row,sourceVersion:'old'}])
 expect(await runPreventionReminders(now)).toMatchObject({cancelled:1});expect(mocks.emit).not.toHaveBeenCalled()
})
it('owner query prevents reassigned policy access',async()=>{await runPreventionReminders(now);expect(mocks.findFirst.mock.calls[0][0].where).toMatchObject({id:'p',ownerUserId:'u'})})
it('provider/bus failure is not marked as delivered',async()=>{mocks.emit.mockResolvedValue({written:0,deduped:false});expect(await runPreventionReminders(now)).toMatchObject({failed:1,reminded:0})})
it('flag off does not even query progress',async()=>{vi.stubEnv('PREVENTION_HUB_ENABLED','0');await runPreventionReminders(now);expect(mocks.findMany).not.toHaveBeenCalled()})
