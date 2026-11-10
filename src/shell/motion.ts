// One interruptible spring keeps shell surfaces moving together.
export const shellSpring = { type: "spring" as const, stiffness: 340, damping: 34, mass: 0.9 };
export const controlSpring = { type: "spring" as const, stiffness: 460, damping: 30, mass: 0.7 };
