import { getUserProfile } from "@/lib/auth";
import { getUserRules } from "@/lib/rules-store";
import { generateRuleSuggestions } from "@/lib/rules-suggestions";
import RulesClient from "./rules-client";

export default async function RulesPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const rulesResult = await getUserRules();
  const suggestions = await generateRuleSuggestions(profile.id);

  return (
    <RulesClient
      initialRules={rulesResult?.rules ?? []}
      initialSuggestions={suggestions}
    />
  );
}
