import { expect, it } from 'vitest'
import { removeComposedDocument } from '@/lib/prevention/remove-document'
import { BenefitCompositionSchema } from '@/lib/prevention/contracts'
it('erases composed personal content in policy and archived nested runs without falling back to old perks', () => {
 const composition={documents:[{id:'removed'}],benefits:[{perk:{name:'private'}}],conditions:[{text:'private'}]}
 const value={acordData:{extraction:{benefitComposition:composition}},steps:[{output:{benefitComposition:composition}}],untouched:'keep'}
 const result=removeComposedDocument(value,'removed') as any
 expect(JSON.stringify(result)).not.toContain('private');expect(JSON.stringify(result)).not.toContain('removed')
 expect(result.untouched).toBe('keep');expect(BenefitCompositionSchema.safeParse(result.acordData.extraction.benefitComposition).success).toBe(true)
 expect(result.acordData.extraction.benefitComposition).toMatchObject({benefits:[],documents:[]})
 expect(removeComposedDocument(value,'unrelated')).toEqual(value)
})
