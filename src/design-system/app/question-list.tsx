import { GroupedList, Row } from "../app-layout"

/** QuestionList (§5.3, §8.4): ready-to-ask questions, each one tap from the adviser flow. */
export function QuestionList({ questions, label, askLabel, className }: { questions: ReadonlyArray<{ id: string; text: string; href: string }>; label: string; askLabel: string; className?: string }) {
    return (
        <GroupedList label={label} className={className}>
            {questions.map((q) => (
                <Row key={q.id} primary={q.text} secondary={askLabel} href={q.href} icon={<span aria-hidden>?</span>} />
            ))}
        </GroupedList>
    )
}
