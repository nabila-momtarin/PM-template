export enum TicketType {
    BUG = 'Bug',
    FEATURE = 'Feature',
    IMPROVEMENT = 'Improvement'
}

export enum TicketPriority {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
    EMERGENCY = 'Emergency'
}

export enum TicketStatus {
    OPEN = 'Open',
    IN_PROGRESS  = 'In Progress',
    DEVELOPED = 'Developed',
    QA_IN_PROGRESS = 'QA In Progress',
    READY_FOR_RELEASE = 'Ready for Release',
    RELEASED = 'Released',
    CLOSED = 'Closed'

}

export enum TicketQAStatus {
    NOT_TESTED = 'Not Tested',
    PASSED = 'Passed',
    FAILED = 'Failed'
}