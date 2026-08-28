import mafiaPortrait from "./mafia-portrait.png";
import policePortrait from "./police-portrait.png";
import doctorPortrait from "./doctor-portrait.png";
import citizenPortrait from "./citizen-portrait.png";
import discussionScene from "./discussion-scene.png";
import voteScene from "./vote-scene.png";
import finalDefenseScene from "./final-defense-scene.png";
import knifeSlash from "./knife-slash.png";
import angelSave from "./angel-save.png";
import detectiveReveal from "./detective-reveal.png";
import executionScene from "./execution-scene.png";
import releaseScene from "./release-scene.png";
import type { Role } from "../api/types";
import type { NightEffectKind } from "../components/NightEffectOverlay";

export const ROLE_PORTRAITS: Record<Role, string> = {
  mafia: mafiaPortrait,
  police: policePortrait,
  doctor: doctorPortrait,
  citizen: citizenPortrait,
};

export const DISCUSSION_SCENE = discussionScene;
export const VOTE_SCENE = voteScene;
export const FINAL_DEFENSE_SCENE = finalDefenseScene;

export const NIGHT_EFFECT_IMAGES: Record<NightEffectKind, string> = {
  knife: knifeSlash,
  angel: angelSave,
  detective: detectiveReveal,
  executed: executionScene,
  spared: releaseScene,
};
