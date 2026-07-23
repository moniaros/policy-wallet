import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field, Input, Textarea, Select } from '@/components/ui/form'

/**
 * These assertions encode exactly what every hand-rolled form in the app was
 * missing: a label bound to its control, aria-invalid when there is an error,
 * and aria-describedby pointing at a message that is actually announced.
 */
describe('form kit', () => {
    it('binds the label to the control', () => {
        render(
            <Field label="Insurer">
                <Input />
            </Field>
        )
        // getByLabelText only resolves if htmlFor/id are wired correctly.
        expect(screen.getByLabelText('Insurer')).toBeTruthy()
    })

    it('marks the control invalid and points it at the message when there is an error', () => {
        render(
            <Field label="Policy number" error="Required">
                <Input />
            </Field>
        )
        const input = screen.getByLabelText('Policy number')
        expect(input.getAttribute('aria-invalid')).toBe('true')

        const describedBy = input.getAttribute('aria-describedby')
        expect(describedBy).toBeTruthy()

        const message = document.getElementById(describedBy!)
        expect(message?.textContent).toBe('Required')
        // role="alert" so it is announced on appearance, not just on focus.
        expect(message?.getAttribute('role')).toBe('alert')
    })

    it('is not marked invalid when there is no error', () => {
        render(
            <Field label="Premium">
                <Input />
            </Field>
        )
        const input = screen.getByLabelText('Premium')
        expect(input.getAttribute('aria-invalid')).toBeNull()
        expect(input.getAttribute('aria-describedby')).toBeNull()
    })

    it('exposes required to assistive tech, not just as a visual asterisk', () => {
        render(
            <Field label="Start date" required>
                <Input />
            </Field>
        )
        expect(screen.getByLabelText(/Start date/).getAttribute('aria-required')).toBe('true')
    })

    it('renders a hint only while there is no error', () => {
        const { rerender } = render(
            <Field label="Tax ID" hint="Nine digits">
                <Input />
            </Field>
        )
        expect(screen.getByText('Nine digits')).toBeTruthy()

        rerender(
            <Field label="Tax ID" hint="Nine digits" error="Invalid">
                <Input />
            </Field>
        )
        expect(screen.queryByText('Nine digits')).toBeNull()
        expect(screen.getByText('Invalid')).toBeTruthy()
    })

    it('wires textarea and select the same way', () => {
        render(
            <>
                <Field label="Notes" error="Too long">
                    <Textarea />
                </Field>
                <Field label="Branch" error="Pick one">
                    <Select><option value="">—</option></Select>
                </Field>
            </>
        )
        expect(screen.getByLabelText('Notes').getAttribute('aria-invalid')).toBe('true')
        expect(screen.getByLabelText('Branch').getAttribute('aria-invalid')).toBe('true')
    })

    it('still renders standalone, outside a Field', () => {
        render(<Input placeholder="loose" />)
        expect(screen.getByPlaceholderText('loose')).toBeTruthy()
    })
})
