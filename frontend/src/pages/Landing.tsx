/**
 * The public landing page.
 *
 * It exists because `AuthScaffold` was right to take the pitch off the sign-in
 * screen and nothing was ever built to receive it — so for a while the only
 * public surface this product had was a password field, and a visitor who
 * arrived without an account had no way to learn what the thing does.
 *
 * The order is an argument, not a template: the loop first because it is the
 * invention, the engine second because it is the part that has to be believed,
 * the refusals third because they are what separates this from a dashboard that
 * always has a number, and the scoring table fourth because a human-risk score
 * nobody will show the arithmetic for is not auditable. The FAQ answers what a
 * security team asks, including what is not built.
 *
 * REDUCED MOTION IS DECIDED HERE, ONCE. `MotionConfig reducedMotion="user"`
 * makes Framer drop transform and layout animation for anyone whose system asks
 * for it, everywhere below this line, while leaving opacity alone. The
 * alternative — every component checking a hook — is a rule that holds until
 * the first component forgets, and the person it fails is the one who cannot
 * tolerate the failure.
 *
 * Lazy-loaded like every other page (see `app/pages.ts`), so a signed-in
 * analyst going straight to the command centre never downloads it.
 */

import { MotionConfig } from 'framer-motion'
import { LandingScaffold } from '../features/landing/LandingScaffold'
import { HeroSection } from '../features/landing/HeroSection'
import { LoopSection } from '../features/landing/LoopSection'
import { SandboxSection } from '../features/landing/SandboxSection'
import { HonestySection } from '../features/landing/HonestySection'
import { RiskModelSection } from '../features/landing/RiskModelSection'
import { FaqSection } from '../features/landing/FaqSection'
import { FinalCta } from '../features/landing/FinalCta'

export default function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <LandingScaffold>
        <HeroSection />
        <LoopSection />
        <SandboxSection />
        <HonestySection />
        <RiskModelSection />
        <FaqSection />
        <FinalCta />
      </LandingScaffold>
    </MotionConfig>
  )
}
