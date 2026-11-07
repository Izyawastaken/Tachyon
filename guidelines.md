## Rule 1 Corner Radius & Geometry

Follow Apple's **Concentric Corner Radius** principle when designing nested containers and surfaces.

### 1. Concentric Corner Radius

Nested elements should maintain visually consistent corner geometry.

**Formula:**

`Inner Radius = Outer Radius - Padding`

Example:
- Outer container: `24px`
- Internal padding: `12px`
- Inner container: `12px`

This creates a visually harmonious relationship between nested surfaces.

### 2. Continuous Corner Curves

Prefer continuous corner curves (squircle-like geometry) over standard circular corner arcs.

- Corners should transition smoothly into straight edges.
- Avoid abrupt curvature changes.
- Maintain consistent corner treatment across related components.
- Prefer continuous corners for cards, sheets, dialogs, and larger containers.

### 3. Radius Scale

Use a consistent radius scale throughout the interface.

| Component | Radius |
|---|---:|
| Large containers | 24px |
| Cards | 16px |
| Nested surfaces | 12px |
| Inputs | 10px |
| Buttons | 12px |
| Small controls | 8px |
| Pills / Tags | 999px |

These values are defaults, not rigid requirements. Adjust them according to component proportions.

### 4. Nesting Rules

- Avoid arbitrary radius values on nested elements.
- Account for internal padding when calculating child radii.
- Avoid child corners appearing sharper or more rounded than their parent.
- Maintain consistent visual spacing between nested surfaces.
- Do not mix incompatible corner styles within the same component hierarchy.

### 5. Implementation

Use CSS variables to maintain consistency:

```css
:root {
  --radius-container: 24px;
  --radius-card: 16px;
  --radius-nested: 12px;
  --radius-input: 10px;
  --radius-button: 12px;
  --radius-control: 8px;
  --radius-pill: 999px;
}
```

For nested elements, calculate the radius dynamically:

```css
.parent {
  --radius: 24px;
  --padding: 12px;

  border-radius: var(--radius);
  padding: var(--padding);
}

.child {
  border-radius: max(
    0px,
    calc(var(--radius) - var(--padding))
  );
}
```

**Design principle:** Corner radii should feel intentional, mathematically consistent, and visually cohesive. Avoid assigning radii independently without considering the surrounding geometry.


## Rule 2: Proportional Scaling & Typography

Use the **Golden Ratio (φ ≈ 1.618)** as a foundational reference for establishing proportional relationships between typography, spacing, and visual hierarchy.

### 1. Golden Ratio

The Golden Ratio provides a proportional relationship between two values.

**Formula:**

`Larger Value = Smaller Value × 1.618`

`Smaller Value = Larger Value ÷ 1.618`

Use this relationship as a starting point when defining visual scales.

### 2. Typography Scaling

Apply proportional scaling when establishing relationships between heading levels, subheadings, and supporting text.

Example:

| Element | Font Size |
|---|---:|
| Display | 52px |
| H1 | 32px |
| H2 | 20px |
| H3 | 16px |
| Body | 16px |
| Caption | 12px |

Values should be rounded to practical sizes rather than preserving unnecessary decimal precision.

### 3. Spacing & Layout

The Golden Ratio may also inform:
- Spacing between related and unrelated elements.
- Container proportions.
- Width relationships between content sections.
- Visual emphasis and hierarchy.
- Relative sizing of interface components.

Do not force every dimension to follow the Golden Ratio. Use it where it improves visual balance.

### 4. Practical Constraints

- Prioritize readability over mathematical precision.
- Maintain body text at approximately 14–16px or larger where practical.
- Avoid excessive variation between adjacent typography levels.
- Use consistent scaling across related components.
- Round calculated values to sensible design-system tokens.
- Allow contextual adjustments for dense interfaces and smaller screens.

### 5. Implementation

Define reusable typography tokens rather than assigning arbitrary values throughout the interface.

```css
:root {
  --font-display: 52px;
  --font-h1: 32px;
  --font-h2: 20px;
  --font-h3: 16px;
  --font-body: 16px;
  --font-caption: 12px;
}
```

**Design principle:** Establish visual hierarchy through deliberate proportional relationships. The Golden Ratio is a reference for achieving balance, not a rigid mathematical requirement.

## Rule 3: Color Semantics & Application

All interface colors must originate from the active theme. Components must never introduce arbitrary colors when an equivalent theme token exists.

### 1. Theme Inheritance

- All UI components must inherit colors from the active theme.
- Never hardcode palette colors inside individual components.
- Theme switching must update all applicable interface elements.
- Components must remain visually coherent across every supported theme.
- Avoid introducing colors outside the active theme unless they serve a defined semantic purpose.

### 2. Color Roles

Map theme colors to consistent interface roles.

- **Color 1:** Primary accents and emphasis.
- **Color 2:** Secondary surfaces and supporting elements.
- **Color 3:** Elevated surfaces and component backgrounds.
- **Color 4:** Subtle surfaces, borders, and separators.
- **Color 5:** Base backgrounds and foundational surfaces.
- **Text:** Primary foreground and readable content.

### 3. Semantic Colors

Functional states must have dedicated semantic tokens.

- Success
- Warning
- Error
- Information
- Disabled

Semantic colors should remain consistent across themes and must not depend on arbitrary component-level overrides.

### 4. Contrast & Accessibility

- Maintain WCAG 2.2 AA contrast requirements.
- Normal text: minimum 4.5:1 contrast ratio.
- Large text: minimum 3:1 contrast ratio.
- Essential UI components: minimum 3:1 contrast ratio against adjacent colors.
- Never rely exclusively on color to communicate information.
- Validate text and interactive elements against their actual rendered backgrounds.

### 5. Implementation

Use centralized theme tokens.

```css
:root {
  --theme-primary: var(--color-1);
  --theme-secondary: var(--color-2);
  --theme-surface: var(--color-3);
  --theme-border: var(--color-4);
  --theme-background: var(--color-5);
  --theme-text: var(--text);

  --semantic-success: #16A34A;
  --semantic-warning: #D97706;
  --semantic-error: #DC2626;
  --semantic-info: #2563EB;
}
```

**Design principle:** The theme defines the colors; the design system defines how those colors are used. Every component must respect the active theme.

## Rule 4: Spacing, Layout & Visual Rhythm

Every interface must maintain deliberate spacing, consistent alignment, and a predictable layout structure. Whitespace is a functional design element, not wasted space.

### 1. Spacing System

Use a consistent 4px-based spacing scale throughout the interface.

| Token | Value |
|---|---:|
| 2XS | 4px |
| XS | 8px |
| SM | 12px |
| MD | 16px |
| LG | 24px |
| XL | 32px |
| 2XL | 48px |
| 3XL | 64px |
| 4XL | 96px |

- Prefer predefined spacing tokens over arbitrary values.
- Maintain consistent spacing between related components.
- Use larger spacing to separate unrelated sections.
- Avoid inconsistent gaps between elements serving similar purposes.

### 2. Alignment

- Align related elements to shared visual axes.
- Maintain consistent container boundaries.
- Avoid unnecessary alignment changes between sections.
- Ensure icons, text, and interactive elements are visually aligned.
- Prefer predictable alignment patterns over arbitrary positioning.

### 3. Visual Hierarchy Through Spacing

- Related elements should be grouped closely.
- Unrelated elements should have greater separation.
- Use whitespace to establish section boundaries.
- Avoid overcrowding interfaces.
- Give important content sufficient breathing room.

### 4. Layout Consistency

- Use consistent container widths and padding.
- Maintain predictable component placement.
- Avoid unnecessary nesting and excessive containers.
- Use grid and flex layouts where appropriate.
- Ensure layouts adapt naturally to different screen sizes.

### 5. Responsive Behaviour

- Spacing should adapt to available screen dimensions.
- Avoid fixed dimensions where fluid sizing is more appropriate.
- Preserve visual hierarchy across breakpoints.
- Prevent content overflow and unintended clipping.
- Maintain usable spacing on smaller screens.

### 6. Implementation

Define reusable spacing tokens.

```css
:root {
  --space-2xs: 4px;
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;
}
```

**Design principle:** Spacing should communicate relationships. Consistent whitespace creates structure, improves readability, and gives interfaces room to breathe.

## Rule 5: Motion, Animation & Interaction

Motion must combine the visual sophistication and restraint of Apple's interface design with the fluid, responsive, physics-driven interactions of OPPO ColorOS.

Interfaces should feel composed when static and alive when interacted with. Movement must communicate intent, preserve spatial continuity, and respond naturally to user input.

### 1. Motion Philosophy

Follow the principle of **Premium Fluidity**.

- Use Apple's approach to spatial consistency, purposeful motion, and visual restraint.
- Incorporate ColorOS-inspired fluidity, elastic movement, and responsive feedback.
- Interfaces should feel calm and composed at rest, but dynamic and tactile during interaction.
- Motion must serve a functional or experiential purpose.
- Avoid excessive animations, unnecessary transitions, and purely decorative movement.
- Prioritize perceived responsiveness over visual complexity.

### 2. Natural Movement & Continuity

Animations should feel connected rather than like isolated visual effects.

- Prefer morphing and transforming elements over abruptly replacing them.
- Maintain spatial continuity between related interface states.
- Use directional movement to communicate hierarchy and navigation.
- Elements should enter and exit in ways that reflect their relationship to the interface.
- Transitions should feel organic without becoming unpredictable.
- Avoid abrupt movements, unnecessary bouncing, and excessive overshooting.

### 3. Fluidity & Physics

Interactions should feel responsive, tactile, and naturally connected to user input.

- Use spring-based motion for appropriate drag, expansion, and direct-manipulation interactions.
- Allow elements to respond naturally to the speed and direction of user input.
- Use subtle elasticity where it enhances tactile feedback.
- Prefer controlled deceleration over abrupt stopping.
- Avoid exaggerated bounce and rubber-like movement.
- Interactive elements should feel connected to the pointer or touch input rather than following predetermined animation sequences.

### 4. Animation Timing & Easing

Animations should be brief, deliberate, and consistent.

Suggested project-level timing defaults:

| Interaction | Duration |
|---|---:|
| Micro-interactions | 100–150ms |
| Hover / Focus | 100–180ms |
| Button feedback | 100–160ms |
| Component transitions | 180–250ms |
| View transitions | 250–350ms |
| Complex transitions | 350–450ms |

Easing guidelines:

- **Ease-out:** Elements entering the interface.
- **Ease-in:** Elements leaving the interface.
- **Ease-in-out:** General state transitions.
- **Spring:** Direct manipulation, dragging, expansion, and tactile interactions.

These values are starting points, not rigid requirements. Motion should be adapted to the complexity and purpose of each interaction.

### 5. Interaction Feedback

Every meaningful interaction must provide immediate and appropriate feedback.

- Buttons should have distinct hover, pressed, focused, and disabled states.
- Use subtle compression and release animations for tactile button feedback.
- Interactive surfaces should respond naturally to pointer and touch input.
- Loading states should communicate progress without unnecessary distraction.
- State changes should be visually distinguishable.
- Avoid delaying user actions to complete animations.
- Feedback should feel immediate, controlled, and consistent.

### 6. Transitions & Spatial Relationships

Transitions should help users understand how interface elements relate to one another.

- Use shared-element transitions where appropriate.
- Expand cards and surfaces from their original position when contextually relevant.
- Preserve the identity of elements during navigation and state changes.
- Use subtle scale, opacity, and positional transformations.
- Avoid excessive blur, scaling, or overlapping animations.
- Prefer coherent transitions over unrelated entrance and exit effects.

### 7. Lighting & Visual Effects

Use lighting and visual effects sparingly to reinforce depth and interaction.

- Apply subtle glow and light diffusion to appropriate interactive states.
- Use translucency to establish visual depth where appropriate.
- Avoid excessive glassmorphism and artificial lighting.
- Effects must complement the active theme.
- Avoid introducing visual effects that reduce contrast or readability.
- Never use glow or blur as a substitute for clear visual hierarchy.

### 8. Accessibility & Performance

Motion must never compromise usability or accessibility.

- Respect the operating system's Reduce Motion preference.
- Provide simplified alternatives to elaborate animations.
- Avoid unnecessary parallax, continuous movement, and excessive scaling.
- Ensure essential information is never communicated through motion alone.
- Maintain smooth frame pacing and responsive interactions.
- Prefer performant animation properties such as `transform` and `opacity`.
- Avoid excessive simultaneous animations and unnecessary layout recalculations.
- Allow animations to be interrupted or bypassed whenever practical.

### 9. Implementation

Centralize animation values and easing curves.

```css
:root {
  /* Duration */
  --motion-fast: 120ms;
  --motion-normal: 200ms;
  --motion-slow: 300ms;
  --motion-complex: 400ms;

  /* Easing */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);

  /* Interaction */
  --scale-pressed: 0.97;
  --scale-hover: 1.01;
}
```

Use a dedicated spring animation system for interactions that require physical movement. Do not attempt to simulate every spring interaction using fixed CSS transitions.

**Design principle:** Quiet when observed. Fluid when touched. Combine premium visual restraint with expressive, responsive motion. Every interaction should feel intentional, connected, and alive without becoming distracting.