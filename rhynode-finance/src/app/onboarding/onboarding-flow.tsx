"use client";

import { useOnboarding } from "./hooks/use-onboarding";
import OnboardingLayout from "./components/onboarding-layout";
import StepWelcome from "./components/step-welcome";
import StepConnect from "./components/step-connect";
import StepComplete from "./components/step-complete";

export default function OnboardingFlow() {
  const {
    step,
    next,
    back,
    submit,
    mode,
    selectMode,
    handleModeKeyDown,
    modeGroupRef,
    form,
    updateFormField,
    updateCountry,
    goal,
    setGoal,
    loading,
    errors,
    isBusiness,
    isPersonal,
    headingRef,
  } = useOnboarding();

  return (
    <OnboardingLayout step={step}>
      {step === 1 && (
        <StepWelcome
          headingRef={headingRef}
          mode={mode}
          form={form}
          errors={errors}
          loading={loading}
          isPersonal={isPersonal}
          isBusiness={isBusiness}
          modeGroupRef={modeGroupRef}
          onSelectMode={selectMode}
          onModeKeyDown={handleModeKeyDown}
          onUpdateField={updateFormField}
          onUpdateCountry={updateCountry}
          onContinue={next}
        />
      )}
      {step === 2 && (
        <StepConnect
          headingRef={headingRef}
          goal={goal}
          form={form}
          errors={errors}
          loading={loading}
          onUpdateGoal={setGoal}
          onContinue={next}
          onBack={back}
        />
      )}
      {step === 3 && (
        <StepComplete
          headingRef={headingRef}
          mode={mode}
          form={form}
          goal={goal}
          loading={loading}
          isPersonal={isPersonal}
          isBusiness={isBusiness}
          onBack={back}
          onConfirm={submit}
        />
      )}
    </OnboardingLayout>
  );
}
