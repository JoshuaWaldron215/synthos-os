import { useStore } from "../store/useStore";
import { effectiveUser, type EffectiveUser } from "./profile";

export function useUser(id: number): EffectiveUser {
  const profiles = useStore((s) => s.profiles);
  return effectiveUser(id, profiles);
}
