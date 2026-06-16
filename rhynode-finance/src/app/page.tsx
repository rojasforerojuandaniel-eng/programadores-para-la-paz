import { LandingRedirect } from "@/components/auth/landing-redirect";
import { LandingPageV2 } from "@/components/landing/landing-page";

export default function LandingPage() {
  return (
    <>
      <LandingRedirect />
      <LandingPageV2 />
    </>
  );
}
