import { getUserProfile } from "@/lib/auth";
import { getUserRules } from "@/lib/rules-store";
import { generateRuleSuggestions } from "@/lib/rules-suggestions";
import { getLocale, setRequestLocale } from "next-intl/server";
import RulesClient from "./rules-client";

export default async function RulesPage() {
  const locale = await getLocale();
  setRequestLocale(locale);

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
