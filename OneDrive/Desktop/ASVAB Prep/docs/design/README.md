# ASVAB Prep Design System

## Overview
Military-themed design system for the ASVAB Test Prep mobile application with branch-specific customization and authentic military communication.

## Color Palette

### Primary Colors
```css
--dark-olive: #3C3D37      /* Primary backgrounds, headers */
--military-green: #4B5320  /* Accents, buttons, highlights */
--desert-sand: #C2B280     /* Secondary backgrounds, cards */
--khaki: #BDB76B          /* Text, icons, subtle accents */
--tactical-orange: #FF8C00 /* Warnings, CTAs, urgent actions */
```

### Semantic Colors
```css
--success: #228B22         /* Mission accomplished, correct answers */
--warning: #FFD700         /* Attention required, close to limits */
--danger: #DC143C          /* Errors, failures, critical issues */
--info: #4682B4           /* Information, neutral messages */
```

### Branch-Specific Accent Colors
```css
--army-gold: #FFD700       /* Army branch theming */
--navy-blue: #000080       /* Navy branch theming */
--air-force-blue: #00308F   /* Air Force branch theming */
--marine-red: #DC143C       /* Marines branch theming */
--coast-guard-blue: #003366 /* Coast Guard branch theming */
--space-force-silver: #C0C0C0 /* Space Force branch theming */
```

## Typography

### Font Families
```css
/* Primary - Stencil-inspired for headers */
--font-military: 'Oswald', 'Arial Black', sans-serif;

/* Secondary - Clean sans-serif for body text */
--font-body: 'Inter', 'Roboto', system-ui, sans-serif;

/* Monospace - For codes, scores, technical data */
--font-mono: 'JetBrains Mono', 'Consolas', monospace;
```

### Font Sizes & Line Heights
```css
--text-xs: 12px / 16px     /* Fine print, captions */
--text-sm: 14px / 20px     /* Secondary text, labels */
--text-base: 16px / 24px   /* Body text, normal content */
--text-lg: 18px / 28px     /* Emphasized text, buttons */
--text-xl: 20px / 28px     /* Section headers, important text */
--text-2xl: 24px / 32px    /* Page headers, titles */
--text-3xl: 30px / 36px    /* Large headers, hero text */
--text-4xl: 36px / 40px    /* Display text, major headers */
```

### Font Weights
```css
--weight-normal: 400       /* Regular body text */
--weight-medium: 500       /* Emphasized text, labels */
--weight-semibold: 600     /* Button text, headings */
--weight-bold: 700         /* Important headings */
--weight-extrabold: 800    /* Military-style headers */
```

## Layout & Spacing

### Spacing Scale
```css
--space-1: 4px    /* Tight spacing, borders */
--space-2: 8px    /* Close elements, small gaps */
--space-3: 12px   /* Text line spacing */
--space-4: 16px   /* Standard component spacing */
--space-5: 20px   /* Section spacing */
--space-6: 24px   /* Large component spacing */
--space-8: 32px   /* Section separation */
--space-10: 40px  /* Major section spacing */
--space-12: 48px  /* Page section spacing */
--space-16: 64px  /* Large page sections */
```

### Border Radius
```css
--radius-sm: 4px     /* Small buttons, badges */
--radius-base: 8px   /* Cards, input fields */
--radius-lg: 12px    /* Large cards, modals */
--radius-full: 9999px /* Circular elements, pills */
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(60, 61, 55, 0.1);
--shadow-base: 0 4px 6px rgba(60, 61, 55, 0.1);
--shadow-lg: 0 8px 25px rgba(60, 61, 55, 0.15);
--shadow-xl: 0 20px 40px rgba(60, 61, 55, 0.2);
```

## Components

### Buttons

#### Primary Button (Military Action)
```css
.btn-primary {
  background: var(--military-green);
  color: white;
  font-family: var(--font-military);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-base);
}
```

#### Secondary Button (Support Action)
```css
.btn-secondary {
  background: var(--desert-sand);
  color: var(--dark-olive);
  border: 2px solid var(--military-green);
  font-family: var(--font-body);
  font-weight: var(--weight-semibold);
}
```

#### Danger Button (Critical Action)
```css
.btn-danger {
  background: var(--danger);
  color: white;
  font-family: var(--font-military);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
}
```

### Cards

#### Standard Card
```css
.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-base);
  padding: var(--space-6);
  margin-bottom: var(--space-4);
}
```

#### Military Command Card
```css
.command-card {
  background: var(--dark-olive);
  color: white;
  border: 2px solid var(--military-green);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  position: relative;
}

.command-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--tactical-orange);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}
```

### Progress Indicators

#### Circular Progress (ASVAB Readiness)
```css
.progress-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(
    var(--military-green) 0deg,
    var(--military-green) var(--progress-angle),
    var(--desert-sand) var(--progress-angle),
    var(--desert-sand) 360deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-inner {
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

#### Linear Progress Bar
```css
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--desert-sand);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, 
    var(--military-green), 
    var(--tactical-orange)
  );
  transition: width 0.3s ease;
}
```

### Navigation

#### Bottom Tab Navigation
```css
.tab-nav {
  background: var(--dark-olive);
  border-top: 2px solid var(--military-green);
  padding: var(--space-2) 0;
}

.tab-item {
  flex: 1;
  align-items: center;
  padding: var(--space-2);
}

.tab-item.active {
  color: var(--tactical-orange);
}

.tab-item.inactive {
  color: var(--khaki);
}
```

### Forms

#### Input Field
```css
.input-field {
  background: white;
  border: 2px solid var(--desert-sand);
  border-radius: var(--radius-base);
  padding: var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-base);
}

.input-field:focus {
  border-color: var(--military-green);
  outline: none;
  box-shadow: 0 0 0 3px rgba(75, 83, 32, 0.1);
}
```

#### Military Select Dropdown
```css
.military-select {
  background: var(--dark-olive);
  color: white;
  border: 2px solid var(--military-green);
  padding: var(--space-4);
  border-radius: var(--radius-base);
  font-family: var(--font-military);
  text-transform: uppercase;
}
```

## Military Communication Style

### Branch-Specific Greetings
```css
.greeting-army::before { content: "LISTEN UP, SOLDIER! "; }
.greeting-navy::before { content: "ATTENTION ON DECK, SAILOR! "; }
.greeting-airforce::before { content: "AIRMAN, STAND READY! "; }
.greeting-marines::before { content: "OORAH, MARINE! "; }
.greeting-coastguard::before { content: "GUARDIAN, SEMPER PARATUS! "; }
.greeting-spaceforce::before { content: "GUARDIAN, SEMPER SUPRA! "; }
```

### Performance Feedback Styles
```css
.feedback-excellent {
  background: var(--success);
  color: white;
  font-family: var(--font-military);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.feedback-needs-improvement {
  background: var(--warning);
  color: var(--dark-olive);
  font-family: var(--font-military);
  text-transform: uppercase;
}

.feedback-unacceptable {
  background: var(--danger);
  color: white;
  font-family: var(--font-military);
  text-transform: uppercase;
  animation: urgent-pulse 1s infinite;
}
```

## Responsive Design

### Breakpoints
```css
--mobile: 0px       /* Mobile first approach */
--tablet: 768px     /* Tablet landscape */
--desktop: 1024px   /* Desktop and larger tablets */
--large: 1280px     /* Large desktop screens */
```

### Mobile-First Media Queries
```css
/* Mobile styles as default */
.component { /* mobile styles */ }

/* Tablet adjustments */
@media (min-width: 768px) {
  .component { /* tablet styles */ }
}

/* Desktop adjustments */
@media (min-width: 1024px) {
  .component { /* desktop styles */ }
}
```

## Icons & Graphics

### Icon System
- **Source**: React Native Vector Icons (MaterialIcons, FontAwesome)
- **Military Icons**: Custom military-themed icons for branches, ranks, equipment
- **Consistency**: 24px standard size, 32px for primary actions
- **Colors**: Use semantic colors based on context

### Military Branch Insignia
- **Size**: 40x40px for navigation, 60x60px for headers
- **Format**: SVG for scalability
- **Colors**: Official branch colors with fallbacks
- **Usage**: Profile headers, branch selection, group identification

## Animations

### Micro-Interactions
```css
/* Button hover effect */
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
  transition: all 0.2s ease;
}

/* Card hover effect */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
  transition: all 0.3s ease;
}

/* Progress animation */
@keyframes progress-fill {
  from { width: 0%; }
  to { width: var(--target-width); }
}
```

### Loading States
```css
@keyframes military-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-military {
  animation: military-pulse 1.5s infinite;
  color: var(--military-green);
}
```

## Accessibility

### Color Contrast
- **Minimum**: WCAG AA compliance (4.5:1 for normal text)
- **Preferred**: WCAG AAA compliance (7:1 for normal text)
- **Testing**: Regular contrast ratio testing for all color combinations

### Focus States
```css
.focusable:focus {
  outline: 3px solid var(--tactical-orange);
  outline-offset: 2px;
}
```

### Screen Reader Support
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **ARIA Labels**: Descriptive labels for interactive elements
- **Role Attributes**: Proper ARIA roles for custom components

## Implementation Guidelines

### Component Structure
```tsx
interface MilitaryButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  branch?: MilitaryBranch;
  size?: 'sm' | 'base' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
}
```

### Theming Integration
```tsx
const theme = {
  colors: {
    primary: '#4B5320',
    secondary: '#C2B280',
    // ... other colors
  },
  branch: {
    army: { accent: '#FFD700' },
    navy: { accent: '#000080' },
    // ... other branches
  }
};
```

### Usage Examples
```tsx
// Primary military action button
<MilitaryButton variant="primary" branch={user.branch}>
  COMPLETE MISSION
</MilitaryButton>

// Progress card with branch theming
<ProgressCard 
  branch={user.branch}
  percentage={85}
  title="ASVAB READINESS"
  subtitle="Outstanding Performance!"
/>

// Command-style notification
<CommandAlert
  branch={user.branch}
  type="mission-complete"
  message="Mission accomplished! Badge earned!"
/>
```